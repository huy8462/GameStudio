// T-0022 (MOD-RTM-06 phần URP theo tier; SRS-04 §2.1 order 80; PSC-RTM-02 "gọi mỗi 0,5 s bởi render-system").
// Khung: đặt camera theo tier và gọi ZoneStreamer.Tick. Vật liệu dùng chung, lightmap, instancing, LOD là phiếu sau.
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace GameStudio
{
    public sealed class RenderSystem : SystemBase
    {
        public const float StreamIntervalS = 0.5f;

        public override string Id => "render";
        public override int Order => GameStudio.Order.Render;

        EngineContext ctx;
        float nextStream;

        public override void Init(EngineContext c)
        {
            ctx = c;
            ApplyCamera(c.Tier);
        }

        public override void Tick(float dt, float t)
        {
            if (t < nextStream || ctx.Zones == null || ctx.Player == null) return;
            nextStream = t + StreamIntervalS;
            ctx.Zones.Tick(ctx.Player.position);
        }

        public override void OnTierChanged(Tier tier) => ApplyCamera(tier);

        void ApplyCamera(Tier tier)
        {
            var cam = ctx.Camera;
            if (cam == null) return;
            var data = cam.GetComponent<UniversalAdditionalCameraData>();
            if (data == null) return;
            // Tier Thấp tắt khử răng cưa; còn lại FXAA như POC-U1 (MSAA tắt ở URP asset).
            data.antialiasing = tier == Tier.Thap ? AntialiasingMode.None : AntialiasingMode.FastApproximateAntialiasing;
            data.renderShadows = TierBudget.For(tier).ShadowCascades > 0;
        }
    }
}
