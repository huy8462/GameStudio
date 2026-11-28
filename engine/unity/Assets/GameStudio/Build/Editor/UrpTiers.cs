// T-0022 (MOD-RTM-06 Render/UrpTierAssets; CFG-RTM-04; POC-U1 §1): sinh URP asset cho từng tier bằng mã.
// Thấp: không bóng. Vừa: 1 cascade 1024. Cao, Tối đa: 2 cascade 2048. Không MSAA, không HDR (như POC-U1).
using System;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace GameStudio.Build
{
    public static class UrpTiers
    {
        public const string Dir = "Assets/GameStudio/Render/UrpTierAssets";

        /// <summary>Trả mảng theo thứ tự enum Tier.</summary>
        public static RenderPipelineAsset[] EnsureAll()
        {
            Directory.CreateDirectory(Dir);
            var tiers = (Tier[])Enum.GetValues(typeof(Tier));
            var res = new RenderPipelineAsset[tiers.Length];
            foreach (var t in tiers) res[(int)t] = Ensure(t);
            return res;
        }

        static UniversalRenderPipelineAsset Ensure(Tier tier)
        {
            string name = "Urp" + tier;
            string path = $"{Dir}/{name}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
            if (asset == null)
            {
                // URP không có API công khai để tạo renderer data bằng mã; dùng hàm nội bộ như POC-U1.
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
            var b = TierBudget.For(tier);
            var so = new SerializedObject(asset);
            void Set(string n, Action<SerializedProperty> f)
            {
                var sp = so.FindProperty(n);
                if (sp != null) f(sp); else Debug.LogWarning("GS_BUILD URP thiếu thuộc tính " + n);
            }
            Set("m_MSAA", sp => sp.intValue = 1);
            Set("m_RenderScale", sp => sp.floatValue = 1f); // độ phân giải do trần DPR của trang quyết định
            Set("m_SupportsHDR", sp => sp.boolValue = false);
            Set("m_MainLightShadowsSupported", sp => sp.boolValue = b.ShadowCascades > 0);
            Set("m_MainLightShadowmapResolution", sp => sp.intValue = Mathf.Max(256, b.ShadowResolution));
            Set("m_ShadowCascadeCount", sp => sp.intValue = Mathf.Max(1, b.ShadowCascades));
            Set("m_ShadowDistance", sp => sp.floatValue = 120f);
            Set("m_SoftShadowsSupported", sp => sp.boolValue = false);
            Set("m_AdditionalLightsRenderingMode", sp => sp.intValue = 0);
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(asset);
            return asset;
        }
    }
}
