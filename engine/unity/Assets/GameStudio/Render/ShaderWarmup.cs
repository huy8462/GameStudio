// T-0021 (PSC-RTM-01 "trước Chơi", ALG-RTM-01, MOD-RTM-06, MOD-RTM-13; NFR-RTM-01; POC-U1 khựng ~2 s lúc mới vào):
// làm ấm bộ biến thể shader của tier đã chọn trong màn nạp, ≤ 8 biến thể mỗi khung (WarmUpProgressively).
// Bộ biến thể sinh lúc build (Build/Editor/WarmupBuild.cs) vào Resources/GsWarmup<Tier>.shadervariants.
using System.Diagnostics;
using System.Globalization;
using System.Threading.Tasks;
using UnityEngine;

namespace GameStudio
{
    public sealed class WarmupResult
    {
        public bool Done;
        public int Variants, Frames;
        public double Ms, StepMsMax;

        public string Json() =>
            "{\"warmupDone\":" + (Done ? "true" : "false") + ",\"warmupMs\":" + F(Ms) + ",\"variants\":" + Variants +
            ",\"frames\":" + Frames + ",\"stepMsMax\":" + F(StepMsMax) + "}";

        static string F(double v) => System.Math.Round(v, 1).ToString(CultureInfo.InvariantCulture);
    }

    public static class ShaderWarmup
    {
        public const int VariantsPerFrame = 8;
        public const string ResourcePrefix = "GsWarmup";

        public static string ResourceName(Tier t) => ResourcePrefix + t;

        /// <summary>Làm ấm theo lát, mỗi lát một khung. Không có bộ biến thể (dữ liệu cũ) thì coi như xong, Variants = 0.</summary>
        public static async Task<WarmupResult> Run(Tier tier, int perFrame = VariantsPerFrame)
        {
            var r = new WarmupResult();
            var svc = Resources.Load<ShaderVariantCollection>(ResourceName(tier));
            var total = Stopwatch.StartNew();
            if (svc != null)
            {
                r.Variants = svc.variantCount;
                var step = new Stopwatch();
                while (true)
                {
                    step.Restart();
                    bool finished = svc.WarmUpProgressively(perFrame);
                    r.StepMsMax = System.Math.Max(r.StepMsMax, step.Elapsed.TotalMilliseconds);
                    r.Frames++;
                    if (finished) break;
                    await Awaitable.NextFrameAsync();
                }
            }
            r.Ms = total.Elapsed.TotalMilliseconds;
            r.Done = true;
            return r;
        }
    }
}
