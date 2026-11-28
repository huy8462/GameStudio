// T-0022 (MOD-RTM-13, FR-RTM-23): histogram thời gian khung, ô cố định nên ghi mẫu không cấp phát.
namespace GameStudio
{
    public sealed class Histogram
    {
        readonly int[] buckets;
        readonly float step;

        public int Count { get; private set; }
        public double Sum { get; private set; }
        public float Max { get; private set; }

        /// <summary>Mặc định ô 0,25 ms tới 250 ms; mẫu lớn hơn dồn vào ô cuối (Max vẫn giữ giá trị thật).</summary>
        public Histogram(float step = 0.25f, int bucketCount = 1000)
        {
            this.step = step;
            buckets = new int[bucketCount + 1];
        }

        public void Add(float v)
        {
            if (v < 0f) v = 0f;
            int i = (int)(v / step);
            if (i >= buckets.Length) i = buckets.Length - 1;
            buckets[i]++;
            Count++;
            Sum += v;
            if (v > Max) Max = v;
        }

        public float Mean => Count == 0 ? 0f : (float)(Sum / Count);

        /// <summary>Phân vị q (0…1): cận trên của ô chứa mẫu thứ q·Count; ô tràn trả Max.</summary>
        public float Quantile(float q)
        {
            if (Count == 0) return 0f;
            long target = (long)(q * (Count - 1));
            long seen = 0;
            for (int i = 0; i < buckets.Length; i++)
            {
                seen += buckets[i];
                if (seen > target) return i == buckets.Length - 1 ? Max : System.Math.Min((i + 1) * step, Max);
            }
            return Max;
        }

        public void Reset()
        {
            System.Array.Clear(buckets, 0, buckets.Length);
            Count = 0; Sum = 0; Max = 0;
        }
    }
}
