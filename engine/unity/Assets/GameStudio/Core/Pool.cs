// T-0022 (MOD-RTM-02, FR-RTM-23): pool đối tượng để vòng lặp nóng không cấp phát.
using System;
using System.Collections.Generic;

namespace GameStudio
{
    public sealed class Pool<T> where T : class
    {
        readonly Stack<T> free;
        readonly Func<T> create;
        readonly Action<T> reset;

        public int Created { get; private set; }
        public int Free => free.Count;

        public Pool(Func<T> create, Action<T> reset = null, int prewarm = 0)
        {
            this.create = create ?? throw new ArgumentNullException(nameof(create));
            this.reset = reset;
            free = new Stack<T>(Math.Max(prewarm, 4));
            for (int i = 0; i < prewarm; i++) { free.Push(create()); Created++; }
        }

        public T Get()
        {
            if (free.Count > 0) return free.Pop();
            Created++;
            return create();
        }

        public void Release(T item)
        {
            if (item == null) return;
            reset?.Invoke(item);
            free.Push(item);
        }
    }
}
