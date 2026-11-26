// POC-U1 (CR-02, ADR-036): cảnh S1 "nặng" để đo player Unity Web trên A56 (FR-QA-07, SRS-04 §6.3 ngân sách tier Vừa).
// Lúc chạy: tải 16 chunk glb thật của bước terrain.mesh (EP-WLD-04) bằng glTFast, 8 texture KTX2 UASTC 2048,
// 300 vật vẽ instancing (~1,5 nghìn tri mỗi vật), 20 vật liệu, dựng NavMesh từ collider và đo thời gian,
// phát thử .ogg và .m4a qua UnityWebRequestMultimedia. Báo cáo ghép vào JSON của PocPerf.
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Threading.Tasks;
using GLTFast;
using GLTFast.Logging;
using GLTFast.Materials;
using KtxUnity;
using Unity.Collections;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Networking;
using Debug = UnityEngine.Debug;

public class HeavyScene : MonoBehaviour
{
    public PocPerf perf;
    public Material terrainMaterial;
    public Material[] materials = new Material[0]; // 20 vật liệu Lit bật instancing, tạo trong editor để shader không bị loại khi build
    public string[] chunks = new string[0];         // tên tệp trong StreamingAssets/terrain
    public int textureCount = 8;
    public int instanceCount = 300;

    readonly List<Matrix4x4[]> groups = new List<Matrix4x4[]>();
    Mesh instMesh;

    class FixedMaterial : IMaterialGenerator
    {
        readonly Material m;
        public FixedMaterial(Material m) { this.m = m; }
        public Material GetDefaultMaterial(bool pointsSupport = false) => m;
        public Material GenerateMaterial(GLTFast.Schema.MaterialBase gltfMaterial, IGltfReadable gltf, bool pointsSupport = false) => m;
        public void SetLogger(ICodeLogger logger) { }
    }

    static string Url(string rel) => Application.streamingAssetsPath + "/" + rel;
    static string F(double v) => System.Math.Round(v, 1).ToString(CultureInfo.InvariantCulture);

    async void Start()
    {
        var total = Stopwatch.StartNew();
        var sw = Stopwatch.StartNew();
        var root = new GameObject("Terrain").transform;
        int ok = 0;
        long terrainTris = 0;
        var gen = new FixedMaterial(terrainMaterial);
        var loads = new List<Task<bool>>();
        var imports = new List<GltfImport>();
        foreach (var c in chunks)
        {
            var g = new GltfImport(null, null, gen);
            imports.Add(g);
            loads.Add(g.Load(Url("terrain/" + c)));
        }
        var results = await Task.WhenAll(loads);
        for (int i = 0; i < imports.Count; i++)
        {
            if (!results[i]) { Debug.LogWarning("POC chunk lỗi " + chunks[i]); continue; }
            var go = new GameObject(chunks[i]);
            go.transform.SetParent(root, false);
            // glb của terrain.mesh không đặt "scene" mặc định nên dựng cảnh 0 tường minh.
            if (await imports[i].InstantiateSceneAsync(go.transform, 0)) ok++;
        }
        foreach (var mf in root.GetComponentsInChildren<MeshFilter>())
        {
            var mesh = mf.sharedMesh;
            terrainTris += mesh.GetIndexCount(0) / 3;
            mf.gameObject.AddComponent<MeshCollider>().sharedMesh = mesh;
            mf.gameObject.isStatic = true;
        }
        double chunkMs = sw.Elapsed.TotalMilliseconds;

        sw.Restart();
        var texs = new List<Texture2D>();
        string texErr = "";
        for (int i = 0; i < textureCount; i++)
        {
            using var req = UnityWebRequest.Get(Url($"tex/t{i}.ktx2"));
            await req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { texErr = req.error; continue; }
            using var data = new NativeArray<byte>(req.downloadHandler.data, Allocator.Persistent);
            var kt = new KtxTexture();
            var r = await kt.LoadFromBytes(data.AsReadOnly());
            if (r.texture != null) texs.Add(r.texture); else texErr = r.errorCode.ToString();
        }
        double texMs = sw.Elapsed.TotalMilliseconds;
        string texFormat = texs.Count > 0 ? texs[0].graphicsFormat.ToString() : "";
        for (int i = 0; i < materials.Length && texs.Count > 0; i++) materials[i].SetTexture("_BaseMap", texs[i % texs.Count]);
        if (texs.Count > 0) terrainMaterial.SetTexture("_BaseMap", texs[0]);

        BuildInstances();

        Physics.SyncTransforms();
        sw.Restart();
        var sources = new List<NavMeshBuildSource>();
        var bounds = new Bounds(Vector3.zero, new Vector3(600, 400, 600));
        NavMeshBuilder.CollectSources(bounds, ~0, NavMeshCollectGeometry.PhysicsColliders, 0, new List<NavMeshBuildMarkup>(), sources);
        var settings = NavMesh.GetSettingsByID(0);
        var navData = NavMeshBuilder.BuildNavMeshData(settings, sources, bounds, Vector3.zero, Quaternion.identity);
        double navMs = sw.Elapsed.TotalMilliseconds;
        bool navOk = navData != null && NavMesh.AddNavMeshData(navData).valid;
        var tri = NavMesh.CalculateTriangulation();

        perf.extra["s1"] = "{" +
            $"\"chunksLoaded\":{ok},\"chunksWanted\":{chunks.Length},\"terrainTris\":{terrainTris},\"chunkLoadMs\":{F(chunkMs)}," +
            $"\"ktx2Loaded\":{texs.Count},\"ktx2Ms\":{F(texMs)},\"ktx2Format\":\"{texFormat}\",\"ktx2Error\":\"{texErr}\"," +
            $"\"instances\":{instanceCount},\"instanceTris\":{(instMesh != null ? instMesh.triangles.Length / 3 : 0)},\"materials\":{materials.Length}," +
            $"\"navmeshMs\":{F(navMs)},\"navmeshOk\":{(navOk ? "true" : "false")},\"navmeshSources\":{sources.Count},\"navmeshTris\":{tri.indices.Length / 3}," +
            $"\"sceneLoadMs\":{F(total.Elapsed.TotalMilliseconds)}" + "}";
        perf.ready = true;
        StartCoroutine(Audio());
    }

    void BuildInstances()
    {
        instMesh = PocMeshes.UvSphere(24, 32, 1.5f);
        int perGroup = Mathf.CeilToInt(instanceCount / (float)Mathf.Max(1, materials.Length));
        int n = 0;
        var rng = new System.Random(56); // cố định để lần đo nào cũng cùng bố trí
        for (int gi = 0; gi < materials.Length; gi++)
        {
            var list = new List<Matrix4x4>();
            for (int k = 0; k < perGroup && n < instanceCount; k++, n++)
            {
                float x = (float)(rng.NextDouble() * 220 - 110), z = (float)(rng.NextDouble() * 220 - 110);
                float y = Physics.Raycast(new Vector3(x, 500, z), Vector3.down, out var hit, 1000f) ? hit.point.y : 0f;
                float s = 0.8f + (float)rng.NextDouble() * 1.6f;
                list.Add(Matrix4x4.TRS(new Vector3(x, y + s * 1.5f, z), Quaternion.Euler(0, (float)rng.NextDouble() * 360, 0), Vector3.one * s));
            }
            groups.Add(list.ToArray());
        }
    }

    void Update()
    {
        if (instMesh == null) return;
        for (int i = 0; i < groups.Count; i++)
        {
            var rp = new RenderParams(materials[i]) { shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On, receiveShadows = true };
            Graphics.RenderMeshInstanced(rp, instMesh, 0, groups[i]);
        }
    }

    IEnumerator Audio()
    {
        var res = new List<string>();
        foreach (var (file, type) in new[] { ("tone-ogg.bin", AudioType.OGGVORBIS), ("tone-m4a.bin", AudioType.MPEG) }) // đuôi .bin: máy chủ poc chỉ phục vụ danh sách đuôi cố định
        {
            using var req = UnityWebRequestMultimedia.GetAudioClip(Url("audio/" + file), type);
            var dh = (DownloadHandlerAudioClip)req.downloadHandler; dh.streamAudio = false; dh.compressed = false;
            yield return req.SendWebRequest();
            string r = null;
            if (req.result != UnityWebRequest.Result.Success) r = "tải lỗi: " + req.error;
            else
            {
                AudioClip clip = null;
                try { clip = DownloadHandlerAudioClip.GetContent(req); } catch (System.Exception e) { r = "giải mã lỗi: " + e.Message; }
                if (clip == null) r ??= "không có clip";
                else
                {
                    float t0 = Time.realtimeSinceStartup;
                    if (clip.loadState == AudioDataLoadState.Unloaded) clip.LoadAudioData();
                    while (clip.loadState != AudioDataLoadState.Loaded && clip.loadState != AudioDataLoadState.Failed && Time.realtimeSinceStartup - t0 < 5) yield return null;
                    var src = gameObject.AddComponent<AudioSource>();
                    src.clip = clip; src.Play();
                    yield return null;
                    r = $"loadState={clip.loadState} len={clip.length:0.00}s playing={src.isPlaying}";
                }
            }
            res.Add($"\"{file}\":\"{r.Replace("\"", "'")}\"");
        }
        perf.extra["audio"] = "{" + string.Join(",", res) + "}";
    }
}
