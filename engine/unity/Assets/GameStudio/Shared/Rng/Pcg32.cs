// T-0027 (MOD-GEN-01, 02; ALG-GEN-01; PSC-GEN-01; MOD-RTM-15; RR-CR02-04): bản C# của @gamestudio/rng.
// PCG32 XSH-RR, trạng thái 64 bit, đúng từng bit với TS (engine/shared/rng) và Python (engine/build/py/gsrng.py).
// Kiểm chéo bằng engine/shared/rng/vectors.json (TST-GEN-02, RngTests). Lời gọi sinh số không cấp phát (FR-RTM-23);
// DeriveSeed/Fork cấp phát (băm SHA-256), chỉ gọi lúc khởi tạo.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace GameStudio
{
    public sealed class Pcg32
    {
        const ulong Mult = 6364136223846793005UL;
        ulong state;
        readonly ulong inc;

        /// <summary>Khởi tạo như pcg32_srandom_r(seed, stream); seed, stream là uint32.</summary>
        public Pcg32(uint seed, uint stream = 0)
        {
            inc = ((ulong)stream << 1) | 1UL;
            state = 0;
            Step();
            unchecked { state += seed; }
            Step();
        }

        void Step() { unchecked { state = state * Mult + inc; } }

        public uint NextU32()
        {
            ulong old = state;
            Step();
            uint xorshifted = unchecked((uint)(((old >> 18) ^ old) >> 27));
            int rot = (int)(old >> 59);
            return unchecked((xorshifted >> rot) | (xorshifted << ((-rot) & 31)));
        }

        /// <summary>[0, 1).</summary>
        public double Float() => NextU32() / 4294967296.0;

        /// <summary>Số nguyên trong [lo, hi] (đóng hai đầu), không lệch; lo, hi trong khoảng int64 nhưng hi - lo &lt; 2^32.</summary>
        public long Int(long lo, long hi)
        {
            if (hi < lo) throw new ArgumentOutOfRangeException(nameof(hi), "Int(lo, hi): cần lo <= hi");
            uint range = unchecked((uint)(hi - lo + 1));
            if (range == 0) return lo + NextU32();
            uint threshold = unchecked((uint)(0x100000000UL - range) % range);
            while (true)
            {
                uint r = NextU32();
                if (r >= threshold) return lo + (r % range);
            }
        }

        /// <summary>Bản int của Int(lo, hi).</summary>
        public int Next(int lo, int hi) => (int)Int(lo, hi);

        public T Pick<T>(IList<T> items)
        {
            if (items == null || items.Count == 0) throw new ArgumentException("Pick: danh sách rỗng");
            return items[Next(0, items.Count - 1)];
        }

        /// <summary>Fisher-Yates từ cuối về đầu, cùng thứ tự gọi với TS/Python.</summary>
        public void Shuffle<T>(IList<T> items)
        {
            for (int i = items.Count - 1; i > 0; i--)
            {
                int j = Next(0, i);
                T t = items[i]; items[i] = items[j]; items[j] = t;
            }
        }

        /// <summary>Luồng con: tiêu thụ đúng một giá trị của luồng cha (PSC-GEN-01).</summary>
        public Pcg32 Fork(string name) => new Pcg32(DeriveSeed(NextU32(), name), DeriveSeed(name));

        /// <summary>Chỉ dùng cho test.</summary>
        public ulong State => state;
        public ulong Inc => inc;

        /// <summary>4 byte đầu SHA-256(các phần nối bằng '|'), big-endian, uint32. Số in dạng thập phân bất biến văn hoá.</summary>
        public static uint DeriveSeed(params object[] parts)
        {
            var sb = new StringBuilder();
            for (int i = 0; i < parts.Length; i++)
            {
                if (i > 0) sb.Append('|');
                object p = parts[i];
                sb.Append(p is bool b ? (b ? "true" : "false") : Convert.ToString(p, CultureInfo.InvariantCulture));
            }
            using (var sha = SHA256.Create())
            {
                byte[] d = sha.ComputeHash(new UTF8Encoding(false).GetBytes(sb.ToString()));
                return ((uint)d[0] << 24) | ((uint)d[1] << 16) | ((uint)d[2] << 8) | d[3];
            }
        }
    }
}
