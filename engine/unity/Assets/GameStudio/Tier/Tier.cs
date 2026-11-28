// T-0022 (MOD-RTM-07; SRS-04 §6.3; CFG-RTM-04): bậc cấu hình và ngân sách theo bậc.
namespace GameStudio
{
    public enum Tier { Thap = 0, Vua = 1, Cao = 2, ToiDa = 3 }

    /// <summary>Phần ngân sách mà player áp trực tiếp. Số bóng theo CFG-RTM-04 (đề xuất, OIT-RTM-01).</summary>
    public struct TierBudget
    {
        public float DprMax;
        public int ShadowCascades;   // 0 = không bóng
        public int ShadowResolution;
        public int FpsTarget;

        public static TierBudget For(Tier t)
        {
            switch (t)
            {
                case Tier.Thap: return new TierBudget { DprMax = 1.0f, ShadowCascades = 0, ShadowResolution = 0, FpsTarget = 30 };
                case Tier.Vua: return new TierBudget { DprMax = 1.5f, ShadowCascades = 1, ShadowResolution = 1024, FpsTarget = 30 };
                case Tier.Cao: return new TierBudget { DprMax = 2.0f, ShadowCascades = 2, ShadowResolution = 2048, FpsTarget = 30 };
                default: return new TierBudget { DprMax = 2.5f, ShadowCascades = 2, ShadowResolution = 2048, FpsTarget = 30 };
            }
        }
    }

    public static class TierNames
    {
        /// <summary>Tên trong dữ liệu (manifest.tiers, ?tier=, tier-table.json).</summary>
        public static string Key(Tier t) => t == Tier.Thap ? "thap" : t == Tier.Vua ? "vua" : t == Tier.Cao ? "cao" : "toi_da";

        public static bool TryParse(string s, out Tier t)
        {
            switch (s)
            {
                case "thap": t = Tier.Thap; return true;
                case "vua": t = Tier.Vua; return true;
                case "cao": t = Tier.Cao; return true;
                case "toi_da": case "toida": t = Tier.ToiDa; return true;
                default: t = Tier.Vua; return false;
            }
        }
    }
}
