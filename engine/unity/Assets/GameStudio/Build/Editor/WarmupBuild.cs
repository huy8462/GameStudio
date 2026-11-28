// T-0021 (PSC-RTM-01, MOD-RTM-06): sinh bộ biến thể làm ấm cho từng tier lúc build, không thu tay.
// Nguồn: mọi vật liệu trong Render/Materials (vật liệu thật của cảnh) × từ khoá URP toàn cục của tier
// (bóng mặt trời theo số cascade của URP asset tier đó). Mỗi biến thể được Unity kiểm khi tạo ShaderVariant;
// biến thể không có trong shader thì bỏ. Tập rỗng của bất kỳ tier nào → build lỗi.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace GameStudio.Build
{
    public static class WarmupBuild
    {
        public const string MaterialsDir = "Assets/GameStudio/Render/Materials";
        public const string OutDir = "Assets/GameStudio/Render/Warmup/Resources";

        /// <summary>Từ khoá toàn cục của URP theo tier: không bóng, hoặc bóng 1 cascade / nhiều cascade.</summary>
        public static string[][] GlobalSets(Tier tier)
        {
            var b = TierBudget.For(tier);
            if (b.ShadowCascades <= 0) return new[] { new string[0] };
            string shadow = b.ShadowCascades > 1 ? "_MAIN_LIGHT_SHADOWS_CASCADE" : "_MAIN_LIGHT_SHADOWS";
            return new[] { new string[0], new[] { shadow } };
        }

        public static void EnsureAll()
        {
            Directory.CreateDirectory(OutDir);
            var mats = new List<Material>();
            foreach (var guid in AssetDatabase.FindAssets("t:Material", new[] { MaterialsDir }))
            {
                var m = AssetDatabase.LoadAssetAtPath<Material>(AssetDatabase.GUIDToAssetPath(guid));
                if (m != null && m.shader != null) mats.Add(m);
            }
            mats.Sort((a, b) => string.CompareOrdinal(a.name, b.name));
            if (mats.Count == 0) throw new InvalidOperationException("GS_BUILD warmup: không có vật liệu trong " + MaterialsDir);

            foreach (Tier tier in Enum.GetValues(typeof(Tier)))
            {
                var svc = new ShaderVariantCollection();
                bool shadows = TierBudget.For(tier).ShadowCascades > 0;
                foreach (var m in mats)
                {
                    var local = m.shaderKeywords;
                    foreach (var g in GlobalSets(tier))
                        TryAdd(svc, m.shader, PassType.ScriptableRenderPipeline, Concat(local, g));
                    if (shadows) TryAdd(svc, m.shader, PassType.ShadowCaster, local);
                }
                if (svc.variantCount == 0) throw new InvalidOperationException($"GS_BUILD warmup: tập biến thể rỗng cho tier {tier}");
                string path = $"{OutDir}/{ShaderWarmup.ResourceName(tier)}.shadervariants";
                var old = AssetDatabase.LoadAssetAtPath<ShaderVariantCollection>(path);
                if (old != null) AssetDatabase.DeleteAsset(path);
                AssetDatabase.CreateAsset(svc, path);
                Debug.Log($"GS_BUILD warmup tier={TierNames.Key(tier)} materials={mats.Count} variants={svc.variantCount}");
            }
        }

        static string[] Concat(string[] a, string[] b)
        {
            var r = new List<string>(a);
            foreach (var k in b) if (!r.Contains(k)) r.Add(k);
            r.Sort(string.CompareOrdinal);
            return r.ToArray();
        }

        static void TryAdd(ShaderVariantCollection svc, Shader shader, PassType pass, string[] keywords)
        {
            try { svc.Add(new ShaderVariantCollection.ShaderVariant(shader, pass, keywords)); }
            catch (ArgumentException e) { Debug.Log($"GS_BUILD warmup bỏ {shader.name} {pass} [{string.Join(" ", keywords)}]: {e.Message.Split('\n')[0]}"); }
        }
    }
}
