// T-0022 (MOD-RTM-13 phần lõi; EP-RTM-01 ?perf=1; DTO-RTM-08; NFR-RTM-01; POC-U1): đo thời gian tải và khung.
// ?perf=1: sau khi DangChay, bay camera theo PerfRoute 20 s rồi xuất JSON qua GsBridge.PerfReport.
// Phiếu khác ghép số đo riêng vào Extra (giá trị là JSON thô), ví dụ Extra["warmup"] = "{\"ms\":812}".
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;

namespace GameStudio
{
    public sealed class PerfMonitor : IDisposable
    {
        public const float SampleS = 20f, SkipS = 0.5f, StartupWindowS = 10f;

        public readonly bool Enabled;
        public readonly Dictionary<string, string> Extra = new Dictionary<string, string>();
        /// <summary>true khi lớp đo đang lái camera (PlayerSystem nhường).</summary>
        public bool DrivingCamera { get; private set; }
        public bool Done { get; private set; }
        public string Status { get; private set; } = "";

        readonly Histogram frames = new Histogram();
        readonly RenderStats render = new RenderStats();
        readonly PerfRoute route = new PerfRoute();
        double firstFrameMs = -1, readyMs = -1, interactiveMs = -1;
        float runT = -1f, startupMaxMs;
        int statusSec = -1;

        public PerfMonitor(bool enabled) { Enabled = enabled; }

        /// <summary>Gọi mỗi khung từ EngineRunner, kể cả lúc đang tải.</summary>
        public void OnFrame(float unscaledDt, EngineState state, EngineContext ctx)
        {
            if (firstFrameMs < 0) firstFrameMs = GsBridge.NowMs();
            if (readyMs < 0 && state >= EngineState.SanSang && state <= EngineState.TamDung) readyMs = GsBridge.NowMs();
            if (state != EngineState.DangChay || Done) return;
            if (interactiveMs < 0) { interactiveMs = GsBridge.NowMs(); runT = 0f; }

            float ms = unscaledDt * 1000f;
            runT += unscaledDt;
            // Khung max 10 s đầu tính cả khung đầu tiên (đo khựng lúc mới vào game, T-0021).
            if (runT <= StartupWindowS && ms > startupMaxMs) startupMaxMs = ms;
            if (!Enabled) return;

            DrivingCamera = true;
            if (ctx.Camera != null && ctx.Player != null) route.Apply(ctx.Camera.transform, ctx.Player.position, runT / SampleS);
            if (runT > SkipS) { frames.Add(ms); render.Sample(); }
            int sec = Mathf.FloorToInt(runT);
            if (sec != statusSec) { statusSec = sec; Status = $"Đang đo… {sec}/{SampleS:0}s"; } // không tạo chuỗi mỗi khung
            if (runT >= SampleS) Finish(ctx);
        }

        static string F(double v, int d = 1) => Math.Round(v, d).ToString(CultureInfo.InvariantCulture);
        static string S(string v) => "\"" + (v ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
        static float Fps(float ms) => ms > 0 ? 1000f / ms : 0;

        void Finish(EngineContext ctx)
        {
            Done = true;
            DrivingCamera = false;
            var b = new StringBuilder(1024);
            b.Append("{\"schema\":\"perf-sample/player-1\",\"engine\":\"unity-").Append(Application.unityVersion).Append("\",");
            b.Append("\"player\":").Append(S(ManifestCheck.PlayerVersion)).Append(',');
            b.Append("\"gameId\":").Append(S(ctx.Manifest != null ? ctx.Manifest.GameId : "")).Append(',');
            b.Append("\"tier\":").Append(S(TierNames.Key(ctx.Tier))).Append(',');
            b.Append("\"device\":").Append(GsBridge.DeviceJson()).Append(',');
            b.Append("\"screenPx\":").Append(S(Screen.width + "x" + Screen.height)).Append(',');
            b.Append("\"loadMs\":{\"firstFrame\":").Append(F(firstFrameMs, 0)).Append(",\"ready\":").Append(F(readyMs, 0))
                .Append(",\"interactive\":").Append(F(interactiveMs, 0)).Append("},");
            b.Append("\"fps\":{\"avg\":").Append(F(Fps(frames.Mean))).Append(",\"p5\":").Append(F(Fps(frames.Quantile(0.95f))))
                .Append(",\"p1\":").Append(F(Fps(frames.Quantile(0.99f)))).Append("},");
            b.Append("\"frameMs\":{\"p50\":").Append(F(frames.Quantile(0.5f), 2)).Append(",\"p95\":").Append(F(frames.Quantile(0.95f), 2))
                .Append(",\"max\":").Append(F(frames.Max, 2)).Append(",\"startupMax\":").Append(F(startupMaxMs, 2)).Append("},");
            b.Append("\"render\":{\"countersValid\":").Append(render.Valid ? "true" : "false")
                .Append(",\"drawCallsMax\":").Append(render.DrawCallsMax).Append(",\"drawCallsAvg\":").Append(render.DrawCallsAvg)
                .Append(",\"batchesMax\":").Append(render.BatchesMax).Append(",\"setPassMax\":").Append(render.SetPassMax)
                .Append(",\"trisMax\":").Append(render.TrisMax).Append(",\"trisAvg\":").Append(render.TrisAvg).Append("},");
            foreach (var kv in Extra) b.Append(S(kv.Key)).Append(':').Append(kv.Value).Append(',');
            b.Append("\"sampleS\":").Append(F(SampleS, 0)).Append(",\"frames\":").Append(frames.Count).Append('}');
            Status = $"XONG. fps tb {F(Fps(frames.Mean))} | p5 {F(Fps(frames.Quantile(0.95f)))} | khung max {F(frames.Max, 1)} ms";
            GsBridge.PerfReport(b.ToString());
        }

        public void Dispose() => render.Dispose();
    }

    /// <summary>MOD-RTM-13 PerfRoute: đường bay cố định quanh một tâm (route theo dữ liệu qa/routes.json là phiếu QA).</summary>
    public sealed class PerfRoute
    {
        public float Radius = 90f, Height = 45f;

        public void Apply(Transform cam, Vector3 center, float u)
        {
            float a = (u % 1f) * Mathf.PI * 2f;
            cam.position = center + new Vector3(Mathf.Cos(a) * Radius, Height + Mathf.Sin(a * 2f) * 6f, Mathf.Sin(a) * Radius);
            cam.LookAt(center);
        }
    }
}
