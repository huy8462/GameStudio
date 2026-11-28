// T-0022 (MOD-RTM-01, IF-RTM-02, STM-RTM-01; DDD-04 §3.1): vòng đời và vòng lặp hệ thống của player.
// Lớp thuần C# (không MonoBehaviour) để test EditMode chạy được; EngineRunner gọi Tick mỗi khung.
using System;
using System.Collections.Generic;

namespace GameStudio
{
    /// <summary>STM-RTM-01.</summary>
    public enum EngineState { KhoiTao, NapLoi, SanSang, DangChay, TamDung, Loi, DaHuy }

    public sealed class Engine
    {
        public readonly EngineContext Ctx;
        public EngineState State { get; private set; } = EngineState.KhoiTao;
        public string Error { get; private set; }
        /// <summary>Gọi mỗi khi đổi trạng thái (EngineRunner chuyển ra trang nạp).</summary>
        public event Action<EngineState> StateChanged;

        readonly SystemRegistry systems = new SystemRegistry();
        readonly HashSet<string> modules = new HashSet<string>();

        public Engine(EngineContext ctx) { Ctx = ctx; }

        public IReadOnlyList<ISystem> Systems => systems.Items;
        public bool ModuleEnabled(string name) => modules.Contains(name);

        /// <summary>Chèn theo Order (ổn định) rồi gọi Init.</summary>
        public void Register(ISystem s)
        {
            systems.Add(s);
            s.Init(Ctx);
        }

        /// <summary>Bật module theo manifest.modules; mã luôn có trong player (CR-02).</summary>
        public void EnableModule(string name) => modules.Add(name);

        public void BeginLoad() => Move(EngineState.KhoiTao, EngineState.NapLoi);
        public void MarkReady() => Move(EngineState.NapLoi, EngineState.SanSang);
        public void Start() => Move(EngineState.SanSang, EngineState.DangChay);
        public void Pause() => Move(EngineState.DangChay, EngineState.TamDung);
        public void Resume() => Move(EngineState.TamDung, EngineState.DangChay);

        public void Fail(string error)
        {
            if (State == EngineState.DaHuy) return;
            Error = error;
            Set(EngineState.Loi);
        }

        /// <summary>Một khung: kẹp dt, chạy hệ thống theo Order, xả EventBus. Chỉ chạy khi DangChay.</summary>
        public void Tick(float rawDt)
        {
            if (State != EngineState.DangChay) return;
            float dt = Ctx.Clock.Advance(rawDt);
            float t = Ctx.Clock.Time;
            var list = systems.Items;
            for (int i = 0; i < list.Count; i++) list[i].Tick(dt, t);
            Ctx.Bus.Flush();
        }

        /// <summary>Chạy n bước cố định (CFG-RTM-03); chỉ ở mode test.</summary>
        public void StepFixed(int n)
        {
            if (Ctx.Mode != Mode.Test) return;
            for (int i = 0; i < n; i++) Tick(GameClock.TestStep);
        }

        public void NotifyZoneLoaded(LoadedZone z) { var l = systems.Items; for (int i = 0; i < l.Count; i++) l[i].OnZoneLoaded(z); }
        public void NotifyZoneUnloaded(LoadedZone z) { var l = systems.Items; for (int i = 0; i < l.Count; i++) l[i].OnZoneUnloaded(z); }

        public void NotifyTierChanged(Tier tier)
        {
            Ctx.Tier = tier;
            var l = systems.Items;
            for (int i = 0; i < l.Count; i++) l[i].OnTierChanged(tier);
        }

        public void Dispose()
        {
            if (State == EngineState.DaHuy) return;
            var l = systems.Items;
            for (int i = l.Count - 1; i >= 0; i--) l[i].Dispose();
            Set(EngineState.DaHuy);
        }

        void Move(EngineState from, EngineState to)
        {
            if (State == from) Set(to);
        }

        void Set(EngineState s)
        {
            State = s;
            StateChanged?.Invoke(s);
        }
    }
}
