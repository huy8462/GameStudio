// POC-U1 (CR-02, ADR-036; FR-QA-07): dựng cảnh S0/S1 bằng mã, đặt cài đặt Web và build hai player để đo trên Galaxy A56.
// Gọi: Unity.exe -batchmode -quit -buildTarget WebGL -projectPath <dự án> -executeMethod PocBuild.All -logFile <log>
// Dòng log "POC_BUILD ..." là kết quả đọc được bằng máy (thời gian, kích thước, số cảnh báo).
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

public static class PocBuild
{
    const string Gen = "Assets/Generated";

    public static void All()
    {
        Settings();
        var urp = Urp();
        GraphicsSettings.defaultRenderPipeline = urp;
        for (int i = 0; i < QualitySettings.count; i++) { QualitySettings.SetQualityLevel(i, false); QualitySettings.renderPipeline = urp; }
        SceneS0();
        SceneS1();
        AssetDatabase.SaveAssets();
        Build("S0", "Assets/Scenes/S0.unity");
        Build("S1", "Assets/Scenes/S1.unity");
    }

    /// <summary>Chỉ dựng và build lại S0 (cài đặt giống All).</summary>
    public static void OnlyS0()
    {
        Settings();
        GraphicsSettings.defaultRenderPipeline = Urp();
        SceneS0();
        AssetDatabase.SaveAssets();
        Build("S0", "Assets/Scenes/S0.unity");
    }

    /// <summary>Chỉ dựng và build lại S1 (cài đặt giống All).</summary>
    public static void OnlyS1()
    {
        Settings();
        var urp = Urp();
        GraphicsSettings.defaultRenderPipeline = urp;
        SceneS1();
        AssetDatabase.SaveAssets();
        Build("S1", "Assets/Scenes/S1.unity");
    }

    static void Settings()
    {
        var web = NamedBuildTarget.WebGL;
        PlayerSettings.companyName = "GameStudio";
        PlayerSettings.productName = "POC-U1";
        PlayerSettings.colorSpace = ColorSpace.Linear;
        PlayerSettings.SetScriptingBackend(web, ScriptingImplementation.IL2CPP);
        PlayerSettings.SetManagedStrippingLevel(web, ManagedStrippingLevel.High);
        PlayerSettings.SetIl2CppCodeGeneration(web, Il2CppCodeGeneration.OptimizeSize);
        PlayerSettings.stripEngineCode = true;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 }); // chỉ WebGL2
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.decompressionFallback = true; // chưa chắc máy chủ poc gửi Content-Encoding
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.threadsSupport = false;
        PlayerSettings.WebGL.maximumMemorySize = 1024;
        PlayerSettings.WebGL.nameFilesAsHashes = false;
        PlayerSettings.WebGL.template = "PROJECT:Poc";
        // Máy chủ poc chạy http (không TLS); mặc định Unity 6 chặn UnityWebRequest http ngoài localhost.
        PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
        // Tối ưu mã cho kích thước tải (Disk Size with LTO); API nằm ở UnityEditor.WebGL.UserBuildSettings.
        var t = AppDomain.CurrentDomain.GetAssemblies().Select(a => a.GetType("UnityEditor.WebGL.UserBuildSettings")).FirstOrDefault(x => x != null);
        var p = t?.GetProperty("codeOptimization", BindingFlags.Public | BindingFlags.Static);
        if (p != null)
        {
            var names = Enum.GetNames(p.PropertyType);
            var pick = names.Contains("DiskSizeLTO") ? "DiskSizeLTO" : names.Contains("DiskSize") ? "DiskSize" : null;
            if (pick != null) p.SetValue(null, Enum.Parse(p.PropertyType, pick));
            Debug.Log($"POC_BUILD codeOptimization={p.GetValue(null)} options={string.Join("|", names)}");
        }
        else Debug.LogWarning("POC_BUILD codeOptimization không tìm thấy");
    }

    static UniversalRenderPipelineAsset Urp()
    {
        Directory.CreateDirectory(Gen);
        var path = Gen + "/PocURP.asset";
        var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
        if (asset == null)
        {
            var m = typeof(UniversalRenderPipelineAsset).GetMethod("CreateRendererAsset", BindingFlags.NonPublic | BindingFlags.Static);
            var ps = m.GetParameters();
            var args = new object[ps.Length];
            for (int i = 0; i < ps.Length; i++) args[i] = ps[i].HasDefaultValue ? ps[i].DefaultValue : null;
            args[0] = path;
            args[1] = Enum.Parse(ps[1].ParameterType, "UniversalRenderer");
            var data = (ScriptableRendererData)m.Invoke(null, args);
            asset = UniversalRenderPipelineAsset.Create(data);
            AssetDatabase.CreateAsset(asset, path);
        }
        var so = new SerializedObject(asset);
        void Set(string n, Action<SerializedProperty> f) { var sp = so.FindProperty(n); if (sp != null) f(sp); else Debug.LogWarning("POC_BUILD thiếu " + n); }
        Set("m_MSAA", sp => sp.intValue = 1);
        Set("m_RenderScale", sp => sp.floatValue = 1f); // độ phân giải do trần DPR của trang (1,5) quyết định
        Set("m_SupportsHDR", sp => sp.boolValue = false);
        Set("m_MainLightShadowmapResolution", sp => sp.intValue = 1024);
        Set("m_ShadowCascadeCount", sp => sp.intValue = 1);
        Set("m_ShadowDistance", sp => sp.floatValue = 120f);
        Set("m_SoftShadowsSupported", sp => sp.boolValue = false);
        Set("m_AdditionalLightsRenderingMode", sp => sp.intValue = 0);
        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(asset);
        return asset;
    }

    static GameObject Camera(Color bg)
    {
        var go = new GameObject("Main Camera") { tag = "MainCamera" };
        var cam = go.AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = bg;
        cam.farClipPlane = 1000f;
        var d = go.AddComponent<UniversalAdditionalCameraData>();
        d.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
        d.renderPostProcessing = false;
        go.transform.position = new Vector3(0, 30, -60);
        return go;
    }

    static void Sun()
    {
        var go = new GameObject("Sun");
        var l = go.AddComponent<Light>();
        l.type = LightType.Directional;
        l.shadows = LightShadows.Hard;
        l.intensity = 1.2f;
        go.transform.rotation = Quaternion.Euler(50, -30, 0);
    }

    static Material Mat(string name, Color c)
    {
        var path = $"{Gen}/{name}.mat";
        var m = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (m == null) { m = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(m, path); }
        m.SetColor("_BaseColor", c);
        m.SetFloat("_Smoothness", 0.3f);
        m.enableInstancing = true;
        EditorUtility.SetDirty(m);
        return m;
    }

    static void SceneS0()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        Camera(new Color(0.45f, 0.6f, 0.8f));
        Sun();
        var plane = GameObject.CreatePrimitive(PrimitiveType.Plane);
        plane.transform.localScale = Vector3.one * 10;
        plane.GetComponent<Renderer>().sharedMaterial = Mat("Plane", new Color(0.4f, 0.55f, 0.35f));
        var perf = new GameObject("Perf").AddComponent<PocPerf>();
        perf.sceneId = "S0"; perf.ready = true; perf.orbitRadius = 40; perf.orbitHeight = 15;
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/S0.unity");
    }

    static void SceneS1()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        Camera(new Color(0.55f, 0.7f, 0.9f));
        Sun();
        var perf = new GameObject("Perf").AddComponent<PocPerf>();
        perf.sceneId = "S1"; perf.orbitRadius = 90; perf.orbitHeight = 45;
        var heavy = new GameObject("Heavy").AddComponent<HeavyScene>();
        heavy.perf = perf;
        heavy.terrainMaterial = Mat("Terrain", Color.white);
        heavy.terrainMaterial.enableInstancing = false;
        heavy.materials = Enumerable.Range(0, 20).Select(i => Mat($"Inst{i:00}", Color.HSVToRGB(i / 20f, 0.45f, 0.95f))).ToArray();
        heavy.chunks = Directory.GetFiles("Assets/StreamingAssets/terrain", "*.glb").Select(Path.GetFileName).OrderBy(x => x).Take(16).ToArray();
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/S1.unity");
    }

    static void Build(string id, string scenePath)
    {
        var outDir = Path.GetFullPath($"Build/{id}");
        if (Directory.Exists(outDir)) Directory.Delete(outDir, true);
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { scenePath },
            locationPathName = outDir,
            target = BuildTarget.WebGL,
            options = BuildOptions.None,
        });
        var s = report.summary;
        // S0 không dùng StreamingAssets; bỏ ra để kích thước S0 là player rỗng thật.
        if (id == "S0" && Directory.Exists(Path.Combine(outDir, "StreamingAssets"))) Directory.Delete(Path.Combine(outDir, "StreamingAssets"), true);
        Debug.Log($"POC_BUILD {id} result={s.result} seconds={s.totalTime.TotalSeconds:0} warnings={s.totalWarnings} errors={s.totalErrors}");
        foreach (var step in report.steps)
            foreach (var msg in step.messages)
                if (msg.type == LogType.Warning || msg.type == LogType.Error)
                    Debug.Log($"POC_BUILD_MSG {id} {msg.type}: {msg.content.Split('\n')[0]}");
        if (s.result != BuildResult.Succeeded) EditorApplication.Exit(3);
    }
}
