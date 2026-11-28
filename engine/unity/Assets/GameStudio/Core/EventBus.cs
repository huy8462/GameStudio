// T-0022 (MOD-RTM-02, FR-RTM-23; DDD-04 §3.1): bus sự kiện không cấp phát, hàng đợi vòng 256 struct.
// Emit chỉ xếp hàng; Flush (cuối khung) mới gọi người nghe, theo đúng thứ tự phát.
using System;
using System.Collections.Generic;

namespace GameStudio
{
    public struct GsEvent
    {
        public int Type;
        public float A, B;
        public int S; // chỉ số chuỗi đã intern, -1 nếu không có
    }

    public sealed class EventBus
    {
        public const int Capacity = 256;
        readonly GsEvent[] ring = new GsEvent[Capacity];
        int head, count;
        readonly Dictionary<int, List<Action<GsEvent>>> handlers = new Dictionary<int, List<Action<GsEvent>>>();

        /// <summary>Số sự kiện bị bỏ vì hàng đợi đầy (để log, không ném lỗi trong vòng lặp).</summary>
        public int Dropped { get; private set; }
        public int Pending => count;

        public void On(int type, Action<GsEvent> fn)
        {
            if (!handlers.TryGetValue(type, out var list)) handlers[type] = list = new List<Action<GsEvent>>(4);
            list.Add(fn);
        }

        public void Emit(int type, float a = 0, float b = 0, int s = -1)
        {
            if (count == Capacity) { Dropped++; return; }
            int i = (head + count) & (Capacity - 1);
            ring[i].Type = type; ring[i].A = a; ring[i].B = b; ring[i].S = s;
            count++;
        }

        /// <summary>Gọi người nghe cho mọi sự kiện đang chờ; sự kiện phát trong lúc xả cũng được xử lý trong lượt này.</summary>
        public void Flush()
        {
            while (count > 0)
            {
                var e = ring[head];
                head = (head + 1) & (Capacity - 1);
                count--;
                if (!handlers.TryGetValue(e.Type, out var list)) continue;
                for (int i = 0; i < list.Count; i++) list[i](e);
            }
        }
    }
}
