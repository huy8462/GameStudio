// T-0022 (MOD-RTM-02, CFG-RTM-03): đồng hồ game tiêm vào hệ thống. dt kẹp [0; 0,1 s]; mode test dùng bước 1/30 s.
// Luật tất định: hệ thống lấy thời gian ở đây, không đọc Time.* hay DateTime trực tiếp.
namespace GameStudio
{
    public sealed class GameClock
    {
        public const float MaxDt = 0.1f;
        public const float TestStep = 1f / 30f;

        readonly bool fixedStep;

        /// <summary>Giây game đã trôi kể từ khi bắt đầu chạy.</summary>
        public float Time { get; private set; }
        public long Frame { get; private set; }

        public GameClock(bool fixedStep = false) { this.fixedStep = fixedStep; }

        /// <summary>Tiến đồng hồ; trả dt đã kẹp (mode test luôn trả TestStep).</summary>
        public float Advance(float rawDt)
        {
            float dt = fixedStep ? TestStep : rawDt < 0f ? 0f : rawDt > MaxDt ? MaxDt : rawDt;
            Time += dt;
            Frame++;
            return dt;
        }
    }
}
