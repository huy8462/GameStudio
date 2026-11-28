// T-0022 (MOD-RTM-01; SEQ-RTM-01): dựng cảnh Boot bằng mã: GameObject "GameStudio" (EngineRunner), camera, mặt trời.
// Cảnh không soạn tay; chạy lại PlayerBuild.Prepare là ra đúng cảnh này.
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace GameStudio.Build
{
    public static class BootScene
    {
        public const string Path = "Assets/GameStudio/Scenes/Boot.unity";
        public const string TerrainMaterialPath = "Assets/GameStudio/Render/Materials/Terrain.mat";
        public const string TierTablePath = "Assets/GameStudio/Tier/tier-table.json";

        public static void Create(RenderPipelineAsset[] urpByTier)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.7f, 0.9f);
            cam.nearClipPlane = 0.3f;
            cam.farClipPlane = 1000f;
            var data = camGo.AddComponent<UniversalAdditionalCameraData>();
            data.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
            data.renderPostProcessing = false;
            camGo.transform.position = new Vector3(0, 30, -60);
            camGo.AddComponent<AudioListener>();

            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Hard;
            sun.intensity = 1.2f;
            sun.transform.rotation = Quaternion.Euler(50, -30, 0);

            var runner = new GameObject("GameStudio").AddComponent<EngineRunner>(); // tên cố định: đích của SendMessage (IF-RTM-01)
            runner.mainCamera = cam;
            runner.urpByTier = urpByTier;
            runner.terrainMaterial = TerrainMaterial();
            runner.tierTable = AssetDatabase.LoadAssetAtPath<TextAsset>(TierTablePath);
            if (runner.tierTable == null) throw new FileNotFoundException("Thiếu " + TierTablePath);

            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Path));
            EditorSceneManager.SaveScene(scene, Path);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(Path, true) };
        }

        /// <summary>Vật liệu Lit tạo trong editor để shader không bị loại khi build (POC-U1). Tạm cho tới bước materials.</summary>
        static Material TerrainMaterial()
        {
            var m = AssetDatabase.LoadAssetAtPath<Material>(TerrainMaterialPath);
            if (m == null)
            {
                Directory.CreateDirectory(System.IO.Path.GetDirectoryName(TerrainMaterialPath));
                m = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                AssetDatabase.CreateAsset(m, TerrainMaterialPath);
            }
            m.SetColor("_BaseColor", new Color(0.45f, 0.58f, 0.36f));
            m.SetFloat("_Smoothness", 0.1f);
            EditorUtility.SetDirty(m);
            return m;
        }
    }
}
