// T-0022 (IF-RTM-03; DDD-04 §3.1): ngữ cảnh dùng chung của các hệ thống.
// Khung chỉ có phần đã làm; Rng, Data, Nav, Audio, Ui, Save, State thêm ở phiếu của từng phần.
using UnityEngine;

namespace GameStudio
{
    public sealed class EngineContext
    {
        public Camera Camera;
        public Tier Tier;
        public TierBudget Budgets;
        public GameClock Clock;
        public EventBus Bus;
        public ZoneStreamer Zones;
        public ILog Log;
        public Mode Mode;
        public InputState Input;
        public Manifest Manifest;
        /// <summary>Người chơi (do CameraPlayerSystem tạo); null trước khi hệ thống đó Init.</summary>
        public Transform Player;
        public PerfMonitor Perf;
        /// <summary>Vật liệu địa hình tạm (tới khi có bước materials).</summary>
        public Material TerrainMaterial;
    }

    [System.Serializable]
    public struct BootOptions
    {
        public string manifestUrl;
        public string mode;   // "play" | "preview" | "test"
        public long seed;
        public string tier;   // "auto" | "thap" | "vua" | "cao" | "toi_da"
        public bool liveRuntimeData;

        public Mode ParsedMode => mode == "preview" ? Mode.Preview : mode == "test" ? Mode.Test : Mode.Play;
    }
}
