// T-0019 (PSC-CHR-07, CFG-CHR-06): lập lịch dựng NavMesh theo ô, thuần C# để test EditMode.
// Thứ tự: vòng Chebyshev quanh ô người chơi (ô chứa người chơi, rồi ô kề), rồi khoảng cách, rồi họ tác nhân.
// Tối đa MaxInFlight việc đang dựng; người chơi sang ô khác thì xếp lại phần chưa dựng.
using System;
using System.Collections.Generic;

namespace GameStudio
{
    public struct NavJob
    {
        public int Tile, Agent;
        public override string ToString() => $"{Tile}:{Agent}";
    }

    public sealed class NavTileQueue
    {
        public const int MaxInFlight = 1; // CFG-CHR-06

        readonly int[] tx, tz;
        readonly int agents;
        readonly bool[] done;
        readonly List<NavJob> pending = new List<NavJob>();
        int inFlight, doneCount;
        int px = int.MinValue, pz = int.MinValue;

        public NavTileQueue(IReadOnlyList<NavTile> tiles, int agentCount, int playerX, int playerZ)
        {
            if (agentCount <= 0) throw new ArgumentOutOfRangeException(nameof(agentCount));
            tx = new int[tiles.Count];
            tz = new int[tiles.Count];
            for (int i = 0; i < tiles.Count; i++) { tx[i] = tiles[i].X; tz[i] = tiles[i].Z; }
            agents = agentCount;
            done = new bool[tiles.Count * agentCount];
            for (int t = 0; t < tiles.Count; t++)
                for (int a = 0; a < agentCount; a++) pending.Add(new NavJob { Tile = t, Agent = a });
            Reorder(playerX, playerZ);
        }

        public int Total => done.Length;
        public int Done => doneCount;
        public int Pending => pending.Count;
        public int InFlight => inFlight;
        public bool AllDone => doneCount == done.Length;

        public bool IsDone(int tile, int agent) => done[tile * agents + agent];

        /// <summary>Ô (theo chỉ số) chứa điểm (x, z) trên lưới tileSize; -1 nếu ngoài zone.</summary>
        public int TileAt(int x, int z)
        {
            for (int i = 0; i < tx.Length; i++) if (tx[i] == x && tz[i] == z) return i;
            return -1;
        }

        /// <summary>Mọi họ tác nhân của ô đã dựng xong.</summary>
        public bool TileReady(int tile)
        {
            if (tile < 0) return false;
            for (int a = 0; a < agents; a++) if (!done[tile * agents + a]) return false;
            return true;
        }

        /// <summary>Xếp lại phần chưa dựng khi người chơi sang ô khác (không đụng việc đang dựng).</summary>
        public void Reorder(int playerX, int playerZ)
        {
            if (playerX == px && playerZ == pz) return;
            px = playerX; pz = playerZ;
            pending.Sort(Compare);
        }

        int Compare(NavJob a, NavJob b)
        {
            int c = Ring(a.Tile).CompareTo(Ring(b.Tile));
            if (c != 0) return c;
            c = Dist2(a.Tile).CompareTo(Dist2(b.Tile));
            if (c != 0) return c;
            c = a.Agent.CompareTo(b.Agent);
            return c != 0 ? c : a.Tile.CompareTo(b.Tile);
        }

        int Ring(int t) => Math.Max(Math.Abs(tx[t] - px), Math.Abs(tz[t] - pz));
        long Dist2(int t) { long dx = tx[t] - px, dz = tz[t] - pz; return dx * dx + dz * dz; }

        /// <summary>Lấy việc kế tiếp nếu chưa đủ MaxInFlight việc đang dựng.</summary>
        public bool TryNext(out NavJob job)
        {
            job = default;
            if (inFlight >= MaxInFlight || pending.Count == 0) return false;
            job = pending[0];
            pending.RemoveAt(0);
            inFlight++;
            return true;
        }

        /// <summary>Bỏ dở việc đang dựng (zone bị gỡ giữa chừng): trả lại đầu hàng đợi.</summary>
        public void Requeue(NavJob job)
        {
            if (inFlight <= 0) throw new InvalidOperationException("Không có việc đang dựng");
            inFlight--;
            pending.Insert(0, job);
        }

        public void Complete(NavJob job)
        {
            if (inFlight <= 0) throw new InvalidOperationException("Không có việc đang dựng");
            inFlight--;
            int k = job.Tile * agents + job.Agent;
            if (!done[k]) { done[k] = true; doneCount++; }
        }
    }

    /// <summary>LRU theo id zone (CFG-CHR-06: giữ 2 zone trong phiên). Put trả về giá trị bị đẩy ra để giải phóng.</summary>
    public sealed class NavZoneLru<T> where T : class
    {
        readonly int capacity;
        readonly List<string> order = new List<string>(); // cũ nhất ở đầu
        readonly Dictionary<string, T> items = new Dictionary<string, T>();

        public NavZoneLru(int capacity = 2) { this.capacity = Math.Max(1, capacity); }

        public int Count => items.Count;
        public bool Contains(string id) => items.ContainsKey(id);

        /// <summary>Đọc không đổi thứ tự LRU.</summary>
        public bool Peek(string id, out T v) => items.TryGetValue(id, out v);

        public bool TryGet(string id, out T v)
        {
            if (!items.TryGetValue(id, out v)) return false;
            Touch(id);
            return true;
        }

        public T Put(string id, T v)
        {
            items[id] = v;
            Touch(id);
            if (order.Count <= capacity) return null;
            string old = order[0];
            order.RemoveAt(0);
            var evicted = items[old];
            items.Remove(old);
            return evicted;
        }

        void Touch(string id)
        {
            order.Remove(id);
            order.Add(id);
        }
    }
}
