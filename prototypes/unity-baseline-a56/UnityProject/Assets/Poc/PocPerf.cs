// POC-U1 (CR-02, ADR-036; FR-QA-07, EP-RTM-01 ?perf=1, OIT-GEN-01 ?dpr=): lớp đo cho player Unity Web.
// ?perf=1: khi cảnh báo sẵn sàng, chạy bay camera cố định 20 s, ghi thời gian khung, rồi hiện kết quả JSON
// (khung chữ chọn được trong trang + console "POC_PERF {...}"). Không gửi dữ liệu đi đâu.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using Unity.Profiling;
using UnityEngine;

public class PocPerf : MonoBehaviour
{
    public const float SampleS = 20f;
    public string sceneId = "S0";
    public Vector3 orbitCenter = Vector3.zero;
    public float orbitRadius = 60f;
    public float orbitHeight = 30f;

    /// <summary>Cảnh đặt true khi đã tải xong (S0 sẵn sàng ngay).</summary>
    public bool ready;
    /// <summary>Thông tin thêm của cảnh (navmesh, âm thanh, số chunk...) ghép vào JSON dạng "khoá": giá trị JSON.</summary>
    public readonly Dictionary<string, string> extra = new Dictionary<string, string>();

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern double PocNowMs();
    [DllImport("__Internal")] static extern string PocQuery();
    [DllImport("__Internal")] static extern string PocGpu();
    [DllImport("__Internal")] static extern string PocDevice();
    [DllImport("__Internal")] static extern void PocReport(string json);
#else
    static double PocNowMs() => Time.realtimeSinceStartupAsDouble * 1000.0;
    static string PocQuery() => "";
    static string PocGpu() => SystemInfo.graphicsDeviceName;
    static string PocDevice() => "{}";
    static void PocReport(string json) => Debug.Log("POC_PERF " + json);
#endif

    bool perf;
    double firstFrameMs = -1, readyMs = -1;
    float flyT = -1;
    bool done;
    string status = "";
    readonly List<float> times = new List<float>(4096);
    ProfilerRecorder drawCalls, batches, tris, setPass;
    long maxDraw, maxBatches, maxTris, maxSetPass;
    readonly List<float> drawS = new List<float>(4096), trisS = new List<float>(4096);

    void Awake()
    {
        perf = PocQuery().Contains("perf=1");
        Application.targetFrameRate = -1;
        QualitySettings.vSyncCount = 0;
        drawCalls = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
        batches = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Batches Count");
        tris = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
        setPass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count");
    }

    void OnDestroy()
    {
        drawCalls.Dispose(); batches.Dispose(); tris.Dispose(); setPass.Dispose();
    }

    void Update()
    {
        if (firstFrameMs < 0) firstFrameMs = PocNowMs();
        var cam = Camera.main;
        if (!ready) { status = "Đang tải cảnh…"; return; }
        if (readyMs < 0) { readyMs = PocNowMs(); flyT = 0; }

        float dt = Time.unscaledDeltaTime;
        if (perf && !done) flyT += dt; else flyT += dt * 0.5f;
        float u = (flyT / SampleS) % 1f;
        float a = u * Mathf.PI * 2f;
        var pos = orbitCenter + new Vector3(Mathf.Cos(a) * orbitRadius, orbitHeight + Mathf.Sin(a * 2f) * 6f, Mathf.Sin(a) * orbitRadius);
        if (cam != null) { cam.transform.position = pos; cam.transform.LookAt(orbitCenter); }

        if (!perf || done) return;
        if (flyT > 0.5f) times.Add(dt * 1000f); // bỏ nửa giây đầu (khung chuyển từ tải sang chạy)
        maxDraw = Math.Max(maxDraw, drawCalls.LastValue);
        maxBatches = Math.Max(maxBatches, batches.LastValue);
        maxTris = Math.Max(maxTris, tris.LastValue);
        maxSetPass = Math.Max(maxSetPass, setPass.LastValue);
        if (flyT > 0.5f) { drawS.Add(drawCalls.LastValue); trisS.Add(tris.LastValue); }
        status = $"Đang đo… {Mathf.FloorToInt(flyT)}/{SampleS:0}s";
        if (flyT >= SampleS) Finish();
    }

    static float Q(List<float> s, float q) => s.Count == 0 ? 0 : s[Mathf.Clamp(Mathf.FloorToInt(q * (s.Count - 1)), 0, s.Count - 1)];
    static float Med(List<float> l) { if (l.Count == 0) return 0; var c = new List<float>(l); c.Sort(); return c[c.Count / 2]; }
    static string F(double v, int d = 1) => Math.Round(v, d).ToString(CultureInfo.InvariantCulture);
    static string S(string v) => "\"" + (v ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";

    void Finish()
    {
        done = true;
        var s = new List<float>(times); s.Sort();
        double sum = 0; foreach (var t in s) sum += t;
        float fps(float ms) => ms > 0 ? 1000f / ms : 0;
        bool counters = drawCalls.Valid && maxDraw > 0;
        var b = new StringBuilder();
        b.Append('{');
        b.Append("\"schema\":\"perf-sample/poc-u1\",\"engine\":\"unity-").Append(Application.unityVersion).Append("\",");
        b.Append("\"scene\":").Append(S(sceneId)).Append(',');
        b.Append("\"device\":").Append(PocDevice()).Append(',');
        b.Append("\"gpu\":").Append(S(PocGpu())).Append(',');
        b.Append("\"screenPx\":").Append(S(Screen.width + "x" + Screen.height)).Append(',');
        b.Append("\"loadMs\":{\"firstFrame\":").Append(F(firstFrameMs, 0)).Append(",\"interactive\":").Append(F(readyMs, 0)).Append("},");
        b.Append("\"fps\":{\"avg\":").Append(F(s.Count > 0 ? 1000.0 * s.Count / sum : 0))
            .Append(",\"p5\":").Append(F(fps(Q(s, 0.95f)))).Append(",\"p1\":").Append(F(fps(Q(s, 0.99f)))).Append("},");
        b.Append("\"frameMs\":{\"p50\":").Append(F(Q(s, 0.5f), 2)).Append(",\"p95\":").Append(F(Q(s, 0.95f), 2))
            .Append(",\"max\":").Append(F(s.Count > 0 ? s[s.Count - 1] : 0, 2)).Append("},");
        b.Append("\"render\":{\"countersValid\":").Append(counters ? "true" : "false")
            .Append(",\"drawCallsMax\":").Append(maxDraw).Append(",\"batchesMax\":").Append(maxBatches)
            .Append(",\"setPassMax\":").Append(maxSetPass)
            .Append(",\"drawCallsP50\":").Append(F(Med(drawS), 0)).Append(",\"trisP50\":").Append(F(Med(trisS), 0)).Append(",\"trisMax\":").Append(maxTris).Append("},");
        foreach (var kv in extra) b.Append(S(kv.Key)).Append(':').Append(kv.Value).Append(',');
        b.Append("\"sampleS\":").Append(F(SampleS, 0)).Append(",\"frames\":").Append(s.Count).Append(",\"at\":")
            .Append(S(DateTime.UtcNow.ToString("o"))).Append('}');
        var json = b.ToString();
        status = $"XONG. fps tb {F(s.Count > 0 ? 1000.0 * s.Count / sum : 0)} | p5 {F(fps(Q(s, 0.95f)))} | p1 {F(fps(Q(s, 0.99f)))}\n" +
                 $"khung p95 {F(Q(s, 0.95f), 2)} ms | draw p50 {F(Med(drawS), 0)} | tri p50 {F(Med(trisS), 0)}\nBấm \"Sao chép JSON\" rồi gửi lại.";
        PocReport(json);
    }

    float fpsSmooth;
    void OnGUI()
    {
        float dt = Time.unscaledDeltaTime;
        if (dt > 0) fpsSmooth = Mathf.Lerp(fpsSmooth <= 0 ? 1f / dt : fpsSmooth, 1f / dt, 0.05f);
        var st = GUI.skin.label; st.fontSize = Mathf.Max(14, Screen.height / 50);
        GUI.Label(new Rect(8, 8, Screen.width - 16, Screen.height / 3f), $"{sceneId} | {fpsSmooth:0} fps\n{status}", st);
    }
}
