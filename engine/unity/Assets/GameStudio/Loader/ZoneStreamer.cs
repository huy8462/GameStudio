// T-0022 (MOD-RTM-05, PSC-RTM-02 phần nạp core, STM-RTM-02, CFG-RTM-01; SEQ-RTM-01): nạp phần core của zone.
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

            // Collider tạm từ mesh vừa nạp (như POC); collider/height-lod1 thuộc phiếu loader sau.
            foreach (var mf in go.GetComponentsInChildren<MeshFilter>())
                if (mf.sharedMesh != null) mf.gameObject.AddComponent<MeshCollider>().sharedMesh = mf.sharedMesh;
            Physics.SyncTransforms();

            var lz = new LoadedZone { Id = zoneId, Root = go.transform, Bounds = zone.Bounds };
            loaded[zoneId] = lz;
            states[zoneId] = ZoneState.CoreSanSang;
            engine.NotifyZoneLoaded(lz);
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
            engine.Ctx.Log.Warn("Bỏ qua tệp core chưa hỗ trợ: " + f.Path);
            return true;
        }
    }
}
