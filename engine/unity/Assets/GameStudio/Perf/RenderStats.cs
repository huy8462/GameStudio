// T-0022 (MOD-RTM-13; DTO-RTM-08 drawCalls, tris): bộ đếm render qua ProfilerRecorder (có giá trị trong bản release, POC-U1).
using System;
using Unity.Profiling;

namespace GameStudio
{
    public sealed class RenderStats : IDisposable
    {
        ProfilerRecorder drawCalls, batches, tris, setPass;
        long sumDraw, sumTris, samples;

        public long DrawCallsMax { get; private set; }
        public long BatchesMax { get; private set; }
        public long TrisMax { get; private set; }
        public long SetPassMax { get; private set; }
        public bool Valid => drawCalls.Valid && DrawCallsMax > 0;
        public long DrawCallsAvg => samples == 0 ? 0 : sumDraw / samples;
        public long TrisAvg => samples == 0 ? 0 : sumTris / samples;

        public RenderStats()
        {
            drawCalls = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
            batches = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Batches Count");
            tris = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
            setPass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count");
        }

        public void Sample()
        {
            long d = drawCalls.LastValue, t = tris.LastValue;
            DrawCallsMax = Math.Max(DrawCallsMax, d);
            BatchesMax = Math.Max(BatchesMax, batches.LastValue);
            TrisMax = Math.Max(TrisMax, t);
            SetPassMax = Math.Max(SetPassMax, setPass.LastValue);
            sumDraw += d; sumTris += t; samples++;
        }

        public void Dispose()
        {
            drawCalls.Dispose(); batches.Dispose(); tris.Dispose(); setPass.Dispose();
        }
    }
}
