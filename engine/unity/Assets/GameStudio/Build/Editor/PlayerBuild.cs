// T-0022, T-0019 (ADR-036, ADR-038, POC-U1 §1; NFR-RTM-01; SRS-04 §6.3 playerMB): build player Unity Web bằng mã, chạy batchmode.
// Gọi: Unity.exe -batchmode -quit -nographics -buildTarget WebGL -projectPath engine/unity
//        -executeMethod GameStudio.Build.PlayerBuild.Build -logFile <log>
// Dòng log "GS_BUILD ..." là kết quả đọc bằng máy. Prepare chỉ sinh asset và cảnh (không build).
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

namespace GameStudio.Build
{
    public static class PlayerBuild
    {
        public const string OutDir = "Build/player";
        public const float PlayerBudgetMB = 10f; // SRS-04 §6.3 playerMB (Huy chốt 26/11/2026)

        public static void Prepare()
        {
            Settings();
            var urp = UrpTiers.EnsureAll();
            GraphicsSettings.defaultRenderPipeline = urp[(int)Tier.Vua];
            // Mỗi URP asset của tier phải gắn vào một mức Quality: bộ loại biến thể shader của URP chỉ xét asset ở
            // GraphicsSettings và QualitySettings. Thiếu thì biến thể "không bóng" của tier Thấp bị loại, địa hình
            // không vẽ được (GL_INVALID_OPERATION, bắt được khi kiểm cục bộ T-0022).
            int levels = QualitySettings.count;
            if (levels < urp.Length) throw new InvalidOperationException($"Cần ≥ {urp.Length} mức Quality, đang có {levels}");
            for (int i = 0; i < levels; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = urp[Mathf.Min(i, urp.Length - 1)];
            }
            QualitySettings.SetQualityLevel((int)Tier.Vua, false);
            Debug.Log($"GS_BUILD qualityLevels={levels}");
            BootScene.Create(urp);
            WarmupBuild.EnsureAll(); // T-0021: bộ biến thể làm ấm theo tier (sau khi có vật liệu của cảnh)
            AssetDatabase.SaveAssets();
            Debug.Log("GS_BUILD prepare ok");
        }

        public static void Build()
        {
            Prepare();
            var outDir = Path.GetFullPath(OutDir);
            if (Directory.Exists(outDir)) Directory.Delete(outDir, true);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { BootScene.Path },
                locationPathName = outDir,
                target = BuildTarget.WebGL,
                options = BuildOptions.None,
            });
            var s = report.summary;
            foreach (var step in report.steps)
                foreach (var msg in step.messages)
                    if (msg.type == LogType.Warning || msg.type == LogType.Error)
                        Debug.Log($"GS_BUILD_MSG {msg.type}: {msg.content.Split('\n')[0]}");
            long bytes = Directory.Exists(Path.Combine(outDir, "Build"))
                ? Directory.GetFiles(Path.Combine(outDir, "Build")).Sum(f => new FileInfo(f).Length) : 0;
            double mb = bytes / 1048576.0;
            Debug.Log(FormattableString.Invariant(
                $"GS_BUILD player result={s.result} seconds={s.totalTime.TotalSeconds:0} warnings={s.totalWarnings} errors={s.totalErrors} playerMB={mb:0.00} budgetMB={PlayerBudgetMB:0} withinBudget={(mb <= PlayerBudgetMB ? "true" : "false")}"));
            if (s.result != BuildResult.Succeeded) EditorApplication.Exit(3);
        }

        static void Settings()
        {
            var web = NamedBuildTarget.WebGL;
            PlayerSettings.companyName = "GameStudio";
            PlayerSettings.productName = "GameStudio Player";
            PlayerSettings.bundleVersion = ManifestCheck.PlayerVersion;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetScriptingBackend(web, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(web, ManagedStrippingLevel.High);
            PlayerSettings.SetIl2CppCodeGeneration(web, Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 }); // chỉ WebGL2
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = true; // máy chủ poc chưa chắc gửi Content-Encoding
            PlayerSettings.WebGL.dataCaching = true;
            // ADR-038 (CR-05, T-0019): đa luồng để NavMesh dựng ngoài luồng chính; trang phải có COOP/COEP.
            PlayerSettings.WebGL.threadsSupport = true;
            PlayerSettings.WebGL.maximumMemorySize = 1024;
            PlayerSettings.WebGL.nameFilesAsHashes = false;
            PlayerSettings.WebGL.template = "PROJECT:GameStudio";
            // Máy chủ poc chạy http (không TLS); bỏ khi có phiếu "poc phục vụ https" (TSD-00 §11).
            PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
            // Tối ưu mã cho kích thước tải (Disk Size with LTO); API nằm ở UnityEditor.WebGL.UserBuildSettings.
            var t = AppDomain.CurrentDomain.GetAssemblies().Select(a => a.GetType("UnityEditor.WebGL.UserBuildSettings")).FirstOrDefault(x => x != null);
            var p = t?.GetProperty("codeOptimization", BindingFlags.Public | BindingFlags.Static);
            if (p == null) { Debug.LogWarning("GS_BUILD codeOptimization không tìm thấy"); return; }
            var names = Enum.GetNames(p.PropertyType);
            var pick = names.Contains("DiskSizeLTO") ? "DiskSizeLTO" : names.Contains("DiskSize") ? "DiskSize" : null;
            if (pick != null) p.SetValue(null, Enum.Parse(p.PropertyType, pick));
            Debug.Log($"GS_BUILD codeOptimization={p.GetValue(null)}");
        }
    }
}
