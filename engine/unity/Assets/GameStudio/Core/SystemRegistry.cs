// T-0022 (MOD-RTM-02; DDD-04 §2.1): danh sách hệ thống xếp theo Order, chèn ổn định.
using System;
using System.Collections.Generic;

namespace GameStudio
{
    public sealed class SystemRegistry
    {
        readonly List<ISystem> items = new List<ISystem>(16);
        public IReadOnlyList<ISystem> Items => items;

        /// <summary>Chèn sau mọi hệ thống có Order nhỏ hơn hoặc bằng (cùng Order: ai đăng ký trước chạy trước).</summary>
        public void Add(ISystem s)
        {
            if (s == null) throw new ArgumentNullException(nameof(s));
            for (int k = 0; k < items.Count; k++)
                if (items[k].Id == s.Id) throw new InvalidOperationException("Trùng hệ thống: " + s.Id);
            int i = items.Count;
            while (i > 0 && items[i - 1].Order > s.Order) i--;
            items.Insert(i, s);
        }

        public T Find<T>() where T : class, ISystem
        {
            for (int i = 0; i < items.Count; i++)
                if (items[i] is T t) return t;
            return null;
        }
    }
}
