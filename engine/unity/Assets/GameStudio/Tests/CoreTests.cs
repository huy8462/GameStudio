// T-0022 (MOD-RTM-01, 02; STM-RTM-01; CFG-RTM-03; TST-RTM-06 phần EventBus): test EditMode cho lõi player.
using System.Collections.Generic;
using NUnit.Framework;

namespace GameStudio.Tests
{
    public class CoreTests
    {
        sealed class Probe : SystemBase
        {
            readonly string id; readonly int order; readonly List<string> log;
            public Probe(string id, int order, List<string> log) { this.id = id; this.order = order; this.log = log; }
            public override string Id => id;
            public override int Order => order;
            public override void Init(EngineContext ctx) => log.Add("init:" + id);
            public override void Tick(float dt, float t) => log.Add("tick:" + id);
            public override void OnZoneLoaded(LoadedZone z) => log.Add("zone:" + id + ":" + z.Id);
            public override void OnTierChanged(Tier tier) => log.Add("tier:" + id + ":" + tier);
            public override void Dispose() => log.Add("dispose:" + id);
        }

        static Engine NewEngine(Mode mode = Mode.Play) =>
            new Engine(new EngineContext { Clock = new GameClock(mode == Mode.Test), Bus = new EventBus(), Mode = mode, Input = new InputState() });

        static void Run(Engine e) { e.BeginLoad(); e.MarkReady(); e.Start(); }

        [Test]
        public void SystemsTickInOrderAndStableForEqualOrder()
        {
            var log = new List<string>();
            var e = NewEngine();
            e.Register(new Probe("render", Order.Render, log));
            e.Register(new Probe("input", Order.Input, log));
            e.Register(new Probe("a", Order.NpcAi, log));
            e.Register(new Probe("b", Order.NpcAi, log));
            Run(e);
            log.Clear();
            e.Tick(0.016f);
            Assert.AreEqual(new[] { "tick:input", "tick:a", "tick:b", "tick:render" }, log.ToArray());
        }

        [Test]
        public void DuplicateSystemIdIsRejected()
        {
            var log = new List<string>();
            var e = NewEngine();
            e.Register(new Probe("x", 10, log));
            Assert.Throws<System.InvalidOperationException>(() => e.Register(new Probe("x", 20, log)));
        }

        [Test]
        public void LifecycleFollowsStateMachine()
        {
            var e = NewEngine();
            var seen = new List<EngineState>();
            e.StateChanged += seen.Add;
            Assert.AreEqual(EngineState.KhoiTao, e.State);
            e.Start(); // chưa SanSang: bỏ qua
            Assert.AreEqual(EngineState.KhoiTao, e.State);
            Run(e);
            e.Pause(); e.Resume(); e.Dispose();
            Assert.AreEqual(new[] { EngineState.NapLoi, EngineState.SanSang, EngineState.DangChay, EngineState.TamDung, EngineState.DangChay, EngineState.DaHuy }, seen.ToArray());
        }

        [Test]
        public void TickOnlyWhenRunningAndFailStops()
        {
            var log = new List<string>();
            var e = NewEngine();
            e.Register(new Probe("s", 10, log));
            log.Clear();
            e.Tick(0.016f);
            Assert.IsEmpty(log);
            Run(e);
            e.Tick(0.016f);
            Assert.AreEqual(1, log.Count);
            e.Fail("hỏng");
            e.Tick(0.016f);
            Assert.AreEqual(1, log.Count);
            Assert.AreEqual(EngineState.Loi, e.State);
            Assert.AreEqual("hỏng", e.Error);
        }

        [Test]
        public void NotificationsReachSystemsAndDisposeIsReversed()
        {
            var log = new List<string>();
            var e = NewEngine();
            e.Register(new Probe("a", 10, log));
            e.Register(new Probe("b", 20, log));
            log.Clear();
            e.NotifyZoneLoaded(new LoadedZone { Id = "z1" });
            e.NotifyTierChanged(Tier.Cao);
            e.Dispose();
            Assert.AreEqual(new[] { "zone:a:z1", "zone:b:z1", "tier:a:Cao", "tier:b:Cao", "dispose:b", "dispose:a" }, log.ToArray());
            Assert.AreEqual(Tier.Cao, e.Ctx.Tier);
        }

        [Test]
        public void StepFixedOnlyInTestMode()
        {
            var play = NewEngine();
            Run(play);
            play.StepFixed(3);
            Assert.AreEqual(0, play.Ctx.Clock.Frame);
            var test = NewEngine(Mode.Test);
            Run(test);
            test.StepFixed(3);
            Assert.AreEqual(3, test.Ctx.Clock.Frame);
            Assert.AreEqual(0.1f, test.Ctx.Clock.Time, 1e-5f);
        }

        [Test]
        public void ClockClampsDt()
        {
            var c = new GameClock();
            Assert.AreEqual(0f, c.Advance(-1f));
            Assert.AreEqual(GameClock.MaxDt, c.Advance(5f));
            Assert.AreEqual(0.02f, c.Advance(0.02f));
            Assert.AreEqual(GameClock.MaxDt + 0.02f, c.Time, 1e-6f);
        }

        [Test]
        public void EventBusDeliversInOrderOnFlush()
        {
            var bus = new EventBus();
            var got = new List<float>();
            bus.On(7, ev => got.Add(ev.A));
            bus.On(7, ev => { if (ev.A == 1f) bus.Emit(7, 99f); }); // phát trong lúc xả vẫn được xử lý
            bus.Emit(7, 1f); bus.Emit(8, 5f); bus.Emit(7, 2f);
            Assert.IsEmpty(got);
            bus.Flush();
            Assert.AreEqual(new[] { 1f, 2f, 99f }, got.ToArray());
            Assert.AreEqual(0, bus.Pending);
        }

        [Test]
        public void EventBusDropsWhenFullAndWrapsAround()
        {
            var bus = new EventBus();
            int n = 0;
            bus.On(1, _ => n++);
            for (int round = 0; round < 3; round++)
            {
                for (int i = 0; i < EventBus.Capacity + 10; i++) bus.Emit(1);
                bus.Flush();
            }
            Assert.AreEqual(EventBus.Capacity * 3, n);
            Assert.AreEqual(30, bus.Dropped);
        }

        [Test]
        public void PoolReusesItems()
        {
            var pool = new Pool<List<int>>(() => new List<int>(), l => l.Clear(), 2);
            var a = pool.Get(); a.Add(1);
            pool.Release(a);
            var b = pool.Get();
            Assert.AreSame(a, b);
            Assert.IsEmpty(b);
            pool.Get(); pool.Get();
            Assert.AreEqual(3, pool.Created);
        }

        [Test]
        public void HistogramQuantiles()
        {
            var h = new Histogram();
            for (int i = 0; i < 95; i++) h.Add(16f);
            for (int i = 0; i < 5; i++) h.Add(40f);
            h.Add(2000f); // tràn ô: Max giữ giá trị thật
            Assert.AreEqual(101, h.Count);
            Assert.AreEqual(16.25f, h.Quantile(0.5f), 1e-3f);
            Assert.AreEqual(40.25f, h.Quantile(0.97f), 1e-3f);
            Assert.AreEqual(2000f, h.Quantile(1f));
            Assert.AreEqual(2000f, h.Max);
        }
    }
}
