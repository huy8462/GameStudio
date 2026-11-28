// T-0022, T-0028 (MOD-RTM-05, PSC-RTM-02 phần nạp core, STM-RTM-02, CFG-RTM-01; SEQ-RTM-01; MOD-WLD-13): nạp phần core của zone.
// T-0028: zone có collider/height-lod1.{r32,meta.json} (packager T-0026) → MeshCollider LOD1 theo ô 64 m + ctx.Terrain;
// không có (dữ liệu thử cũ) → MeshCollider từ lưới hiển thị như T-0022.
// Chưa có: prefetch zone kề, giải phóng, phần full, lightmap, thử lại 2/4/8 s, hàng đợi tải GPU theo lát.
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

namespace GameStudio
{
    /// <summary>STM-RTM-02.</summary>
    public enum ZoneState { ChuaNap, NapCore, CoreSanSang, NapFull, SanSang, GiaiPhong }

    public sealed class ZoneStreamer
    {
        public const int MaxParallel = 4; // CFG-RTM-01

        readonly Manifest manifest;
        readonly string baseUrl;
        readonly Engine engine;
        readonly Transform root;
        readonly Dictionary<string, ZoneState> states = new Dictionary<string, ZoneState>();
        readonly Dictionary<string, LoadedZone> loaded = new Dictionary<string, LoadedZone>();
        readonly Dictionary<string, Texture2D> textures = new Dictionary<string, Texture2D>();
        readonly Dictionary<string, string> texts = new Dictionary<string, string>();
        readonly Dictionary<string, byte[]> binaries = new Dictionary<string, byte[]>();

        /// <summary>(đã xong, tổng) số tệp của lượt nạp hiện tại; Boot chuyển ra trang nạp (gs:progress).</summary>
        public event Action<int, int> Progress;

        public ZoneStreamer(Manifest manifest, string manifestUrl, Engine engine, Transform root)
        {
            this.manifest = manifest;
            this.engine = engine;
            this.root = root;
            int cut = manifestUrl.LastIndexOf('/');
            baseUrl = cut >= 0 ? manifestUrl.Substring(0, cut + 1) : "";
        }

        public ZoneState State(string zoneId) => states.TryGetValue(zoneId, out var s) ? s : ZoneState.ChuaNap;
        public LoadedZone Loaded(string zoneId) => loaded.TryGetValue(zoneId, out var z) ? z : null;
        public Texture2D Texture(string path) => textures.TryGetValue(path, out var t) ? t : null;
        /// <summary>Tệp .json của phần core (vd. nav/sources.json, T-0019); null nếu không có.</summary>
        public string Text(string path) => texts.TryGetValue(path, out var t) ? t : null;

        /// <summary>Nạp parts[tier].core của zone; xong thì CoreSanSang và phát OnZoneLoaded. Lỗi → ném, zone về ChuaNap.</summary>
        public async Task LoadStart(string zoneId)
        {
            var zone = manifest.Zone(zoneId) ?? throw new InvalidOperationException("Không có zone " + zoneId);
            if (State(zoneId) != ZoneState.ChuaNap) return;
            string tier = TierNames.Key(engine.Ctx.Tier);
            if (!zone.Core.TryGetValue(tier, out var files)) throw new InvalidOperationException($"Zone {zoneId} không có phần core cho tier {tier}");

            states[zoneId] = ZoneState.NapCore;
            var go = new GameObject("zone:" + zoneId);
            go.transform.SetParent(root, false);
            try
            {
                int next = 0, done = 0;
                string error = null;
                async Task Worker()
                {
                    while (error == null)
                    {
                        int i = next++;
                        if (i >= files.Length) return;
                        if (!await LoadFile(files[i], go.transform)) error = files[i].Path;
                        Progress?.Invoke(++done, files.Length);
                    }
                }
                var workers = new List<Task>(MaxParallel);
                for (int w = 0; w < Mathf.Min(MaxParallel, files.Length); w++) workers.Add(Worker());
                await Task.WhenAll(workers);
                if (error != null) throw new InvalidOperationException("ERR-RTM-02 không nạp được " + error);
            }
            catch
            {
                UnityEngine.Object.Destroy(go);
                states[zoneId] = ZoneState.ChuaNap;
                throw;
            }

            ApplyBaseLayer(files);
            if (!BuildTerrainCollider(zoneId, files, go.transform))
            {
                // Dữ liệu không có collider LOD1: collider từ lưới hiển thị (như POC, T-0022).
                foreach (var mf in go.GetComponentsInChildren<MeshFilter>())
                    if (mf.sharedMesh != null) mf.gameObject.AddComponent<MeshCollider>().sharedMesh = mf.sharedMesh;
            }
            Physics.SyncTransforms();

            var lz = new LoadedZone { Id = zoneId, Root = go.transform, Bounds = zone.Bounds };
            loaded[zoneId] = lz;
            states[zoneId] = ZoneState.CoreSanSang;
            engine.NotifyZoneLoaded(lz);
        }

        /// <summary>
        /// T-0028 (tạm, tới phiếu vật liệu splat): gắn baseColor lõi của lớp splat đầu tiên (layers.json → material)
        /// làm _BaseMap của vật liệu địa hình, để thấy chi tiết và độ dốc. UV0 của terrain.mesh lặp mỗi 4 m.
        /// Chỉ đổi texture (URP Lit không thêm từ khoá), nên bộ biến thể làm ấm T-0021 vẫn đủ.
        /// </summary>
        void ApplyBaseLayer(FileRef[] files)
        {
            var mat = engine.Ctx.TerrainMaterial;
            if (mat == null) return;
            for (int i = 0; i < files.Length; i++)
            {
                if (!files[i].Path.EndsWith("layers.json", StringComparison.Ordinal) || !texts.TryGetValue(files[i].Path, out var json)) continue;
                var doc = MiniJson.Obj(MiniJson.Parse(json));
                var layers = MiniJson.Arr(doc != null && doc.TryGetValue("layers", out var lv) ? lv : null);
                var first = layers != null && layers.Count > 0 ? MiniJson.Obj(layers[0]) : null;
                var dir = first != null ? MiniJson.Str(first, "material") : null; // "materials/dat-co"
                if (string.IsNullOrEmpty(dir)) return;
                var suffix = "/core/" + dir.Substring(dir.LastIndexOf('/') + 1) + "-basecolor.ktx2";
                foreach (var kv in textures)
                {
                    if (!kv.Key.EndsWith(suffix, StringComparison.Ordinal)) continue;
                    kv.Value.wrapMode = TextureWrapMode.Repeat;
                    mat.SetTexture("_BaseMap", kv.Value);
                    mat.SetColor("_BaseColor", Color.white);
                    engine.Ctx.Log.Info("địa hình: lớp nền " + kv.Key);
                    return;
                }
                return;
            }
        }

        /// <summary>T-0028: độ lệch lớn nhất (m) giữa đỉnh lưới hiển thị (mẫu tối đa 64 đỉnh mỗi mesh, bỏ skirt) và lưới độ cao.</summary>
        static float RenderDeviation(Transform zoneRoot, HeightGrid g)
        {
            float worst = 0f;
            foreach (var mf in zoneRoot.GetComponentsInChildren<MeshFilter>())
            {
                var mesh = mf.sharedMesh;
                if (mesh == null || !mesh.isReadable) continue;
                var v = mesh.vertices;
                int stride = Mathf.Max(1, v.Length / 64);
                for (int i = 0; i < v.Length; i += stride)
                {
                    var p = mf.transform.TransformPoint(v[i]);
                    if (!g.Contains(p.x, p.z)) continue;
                    float d = p.y - g.HeightAt(p.x, p.z);
                    if (d < -1.5f) continue; // đỉnh skirt (thả xuống 2 m dưới mép chunk)
                    worst = Mathf.Max(worst, Mathf.Abs(d));
                }
            }
            return worst;
        }

        /// <summary>T-0028: tìm cặp height-lod1.r32 + .meta.json trong phần core, dựng HeightGrid và MeshCollider LOD1.</summary>
        bool BuildTerrainCollider(string zoneId, FileRef[] files, Transform zoneRoot)
        {
            for (int i = 0; i < files.Length; i++)
            {
                var p = files[i].Path;
                if (!p.EndsWith("height-lod1.r32", StringComparison.Ordinal)) continue;
                var metaPath = p.Substring(0, p.Length - 4) + ".meta.json";
                if (!binaries.TryGetValue(p, out var bytes) || !texts.TryGetValue(metaPath, out var meta)) continue;
                var grid = HeightGrid.Parse(meta, bytes);
                binaries.Remove(p); // dữ liệu đã chép vào lưới
                var ctx = engine.Ctx;
                (ctx.Terrain ?? (ctx.Terrain = new TerrainHeights())).Set(zoneId, grid);
                int n = TerrainColliderBuilder.Build(grid, zoneRoot);
                float dev = RenderDeviation(zoneRoot, grid);
                ctx.Perf?.Extra.Add("terrain", $"{{\"zone\":\"{zoneId}\",\"renderVsColliderMaxM\":{dev.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture)}}}");
                if (dev > 0.25f) ctx.Log.Warn($"zone {zoneId}: lưới hiển thị lệch collider tới {dev:0.##} m");
                ctx.Log.Info($"zone {zoneId}: collider LOD1 {grid.Width}x{grid.Height} ô {grid.CellM} m, {n} khối");
                return true;
            }
            return false;
        }

        /// <summary>Gọi mỗi 0,5 s bởi RenderSystem. Khung chưa prefetch/giải phóng (phần còn lại PSC-RTM-02).</summary>
        public void Tick(Vector3 playerPos) { }

        async Task<bool> LoadFile(FileRef f, Transform parent)
        {
            string url = baseUrl + f.Path;
            if (f.Path.EndsWith(".glb", StringComparison.OrdinalIgnoreCase))
            {
                var node = new GameObject(f.Path);
                node.transform.SetParent(parent, false);
                // T-0028: glTFast đổi hệ tay phải → tay trái bằng cách lật trục X. Dữ liệu GameStudio (spawn, bounds,
                // collider LOD1, nav) dùng thẳng toạ độ thế giới (x đông, z bắc), nên lật lại để lưới hiển thị trùng
                // collider (trên A56 người chơi lún tới nửa thân khi đi xa gốc toạ độ).
                node.transform.localScale = new Vector3(-1f, 1f, 1f);
                return await GltfLoader.Load(url, node.transform, engine.Ctx.TerrainMaterial);
            }
            if (f.Path.EndsWith(".ktx2", StringComparison.OrdinalIgnoreCase))
            {
                var tex = await Ktx2Loader.Load(url);
                if (tex == null) return false;
                textures[f.Path] = tex;
                return true;
            }
            if (f.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                using var req = UnityEngine.Networking.UnityWebRequest.Get(url);
                await req.SendWebRequest();
                if (req.result != UnityEngine.Networking.UnityWebRequest.Result.Success) return false;
                texts[f.Path] = req.downloadHandler.text;
                return true;
            }
            if (f.Path.EndsWith(".r32", StringComparison.OrdinalIgnoreCase))
            {
                using var req = UnityEngine.Networking.UnityWebRequest.Get(url);
                await req.SendWebRequest();
                if (req.result != UnityEngine.Networking.UnityWebRequest.Result.Success) return false;
                binaries[f.Path] = req.downloadHandler.data;
                return true;
            }
            engine.Ctx.Log.Warn("Bỏ qua tệp core chưa hỗ trợ: " + f.Path);
            return true;
        }
    }
}
