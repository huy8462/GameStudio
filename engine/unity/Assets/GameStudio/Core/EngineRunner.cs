// T-0022 (MOD-RTM-01, IF-RTM-01; DDD-04 §3.1): MonoBehaviour trên GameObject tên "GameStudio".
// Trang nạp gọi unityInstance.SendMessage('GameStudio', 'Boot', json) rồi SendMessage('GameStudio', 'Play').
using UnityEngine;
using UnityEngine.Rendering;

namespace GameStudio
{
    public sealed class EngineRunner : MonoBehaviour
    {
        // Các trường dưới do Build/Editor gắn khi dựng cảnh Boot.
        public Camera mainCamera;
        public TextAsset tierTable;
        public RenderPipelineAsset[] urpByTier = new RenderPipelineAsset[0];
        public Material terrainMaterial;

        public Engine Engine { get; private set; }
        public PerfMonitor Perf { get; private set; }

        bool booted, overlay;
        GUIStyle style;

        void Awake()
        {
            Application.targetFrameRate = -1; // nền Web: để trình duyệt điều nhịp bằng requestAnimationFrame
            QualitySettings.vSyncCount = 0;
            bool perf = GsBridge.QueryHas("perf=1");
            overlay = perf || GsBridge.QueryHas("dev=1");
            Perf = new PerfMonitor(perf);
        }

        /// <summary>IF-RTM-01. json là BootOptions.</summary>
        public async void Boot(string json)
        {
            if (booted) return;
            booted = true;
            var opt = JsonUtility.FromJson<BootOptions>(json);
            await GameStudio.Boot.Run(this, opt);
        }

        /// <summary>Người chơi chạm "Chơi" (STM-RTM-01 SanSang → DangChay).</summary>
        public void Play() => Engine?.Start();

        public void Pause() => Engine?.Pause();
        public void Resume() => Engine?.Resume();

        /// <summary>IF-RTM-04. Khung chưa áp nóng dữ liệu (phiếu xem trước).</summary>
        public void ApplyRuntimeData(string jsonPatch) => Debug.LogWarning("GS ApplyRuntimeData chưa hỗ trợ ở khung T-0022");

        public void Attach(Engine engine)
        {
            Engine = engine;
            engine.StateChanged += s => GsBridge.State(s, engine.Error);
            GsBridge.State(engine.State);
        }

        void Update()
        {
            var state = Engine != null ? Engine.State : EngineState.KhoiTao;
            if (Engine != null) Perf.OnFrame(Time.unscaledDeltaTime, state, Engine.Ctx);
            Engine?.Tick(Time.deltaTime);
        }

        void OnApplicationFocus(bool focus)
        {
            // STM-RTM-01: mất tiêu điểm → TamDung. Không tự chạy lại khi đang đo để số đo không lẫn khoảng dừng.
            if (Engine == null || Perf.Enabled) return;
            if (focus) Engine.Resume(); else Engine.Pause();
        }

        void OnDestroy()
        {
            Engine?.Dispose();
            Perf?.Dispose();
        }

        void OnGUI()
        {
            if (!overlay || Engine == null) return;
            if (style == null) style = new GUIStyle(GUI.skin.label) { fontSize = Mathf.Max(14, Screen.height / 50) };
            string text = Engine.State == EngineState.Loi ? "Lỗi: " + Engine.Error : $"{Engine.State} | {TierNames.Key(Engine.Ctx.Tier)}\n{Perf.Status}";
            GUI.Label(new Rect(8, 8, Screen.width - 16, Screen.height / 3f), text, style);
        }
    }
}
