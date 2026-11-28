// T-0022 (MOD-RTM-07, MOD-RTM-06; CFG-RTM-04; STM-RTM-03): áp tier = đổi URP asset của tier rồi báo các hệ thống.
using UnityEngine;
using UnityEngine.Rendering;

namespace GameStudio
{
    public static class ApplyTier
    {
        /// <summary>urpByTier xếp theo thứ tự enum Tier (Render/UrpTierAssets, do Build/Editor sinh).</summary>
        public static void Apply(Tier tier, RenderPipelineAsset[] urpByTier, Engine engine)
        {
            int i = (int)tier;
            if (urpByTier != null && i < urpByTier.Length && urpByTier[i] != null)
            {
                QualitySettings.renderPipeline = urpByTier[i];
                GraphicsSettings.defaultRenderPipeline = urpByTier[i];
            }
            var b = TierBudget.For(tier);
            if (engine == null) return;
            engine.Ctx.Budgets = b;
            engine.NotifyTierChanged(tier);
        }
    }
}
