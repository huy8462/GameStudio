// T-0022, T-0028 (MOD-CHR-01 PlayerSystem; SRS-04 §2.1 order 20; DTO-RTM-01 spawn; PSC-CHR-02, 03).
// Hệ thống người chơi + camera ngôi ba: tạo PlayerController khi Init, đặt lên đất khi zone xuất phát nạp xong
// (TerrainHeights nếu có, không thì raycast), mỗi khung: input → controller → camera. Thay CameraPlayerSystem (T-0022).
using UnityEngine;

namespace GameStudio
{
    public sealed class PlayerSystem : SystemBase
    {
        public override string Id => "camera-player";
        public override int Order => GameStudio.Order.CameraPlayer;

        EngineContext ctx;
        PlayerController controller;
        ThirdPersonCamera cam;
        Collider self;
        bool placed;

        public PlayerController Controller => controller;
        public PlayerMoveState State => controller != null ? controller.State : PlayerMoveState.Dung;

        public override void Init(EngineContext c)
        {
            ctx = c;
            var cfg = new PlayerConfig();
            controller = new PlayerController(cfg, null);
            cam = new ThirdPersonCamera(cfg.HeightM);
            ctx.Player = controller.Root;
            self = controller.Root.GetComponent<Collider>();
            if (ctx.Manifest != null)
            {
                controller.Teleport(ctx.Manifest.SpawnPos, ctx.Manifest.SpawnYaw);
                cam.Yaw = ctx.Manifest.SpawnYaw;
            }
        }

        public override void OnZoneLoaded(LoadedZone z)
        {
            if (placed || ctx.Manifest == null || z.Id != ctx.Manifest.SpawnZone) return;
            var p = ctx.Manifest.SpawnPos;
            float g = ctx.Terrain != null ? ctx.Terrain.HeightAt(p.x, p.z) : float.NaN;
            if (!float.IsNaN(g)) p.y = g + 0.05f;
            else if (Physics.Raycast(new Vector3(p.x, p.y + 2000f, p.z), Vector3.down, out var hit, 5000f)) p.y = hit.point.y + 0.05f;
            controller.Terrain = ctx.Terrain; // tạo khi zone nạp (sau Init)
            controller.Teleport(p, ctx.Manifest.SpawnYaw);
            controller.Enable(true);
            placed = true;
            PlaceCamera(0f);
        }

        public override void Tick(float dt, float t)
        {
            if (!placed) return;
            cam.AddLook(ctx.Input.Look);
            controller.Tick(dt, ctx.Input, cam.Yaw);
            PlaceCamera(dt);
        }

        void PlaceCamera(float dt)
        {
            if (ctx.Camera == null || ctx.Perf != null && ctx.Perf.DrivingCamera) return;
            cam.Place(ctx.Camera, ctx.Player, ctx.Terrain, dt, self);
        }

        public override void Dispose() => controller?.Destroy();
    }
}
