// T-0022, T-0028 (MOD-CHR-01 PlayerSystem; SRS-04 §2.1 order 20; DTO-RTM-01 spawn; PSC-CHR-02, 03).
// Hệ thống người chơi + camera ngôi ba: tạo PlayerController khi Init, đặt lên đất khi zone xuất phát nạp xong
// (TerrainHeights nếu có, không thì raycast), mỗi khung: input → controller → camera. Thay CameraPlayerSystem (T-0022).
// Thân hiển thị tạm là viên nang màu cam (chưa có mô hình nhân vật).
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
            AddPlaceholderBody(controller.Root, cfg);
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

        /// <summary>Thân tạm (viên nang màu cam, không collider) cho tới khi có mô hình nhân vật (E4).</summary>
        void AddPlaceholderBody(Transform root, PlayerConfig cfg)
        {
            if (ctx.TerrainMaterial == null) return;
            // Không dùng CreatePrimitive: nó thêm CapsuleCollider, lớp bị Unity lược khỏi bản Web (strip engine code).
            var body = new GameObject("Player.body");
            body.transform.SetParent(root, false);
            body.AddComponent<MeshFilter>().sharedMesh = CapsuleMesh(cfg.RadiusM, cfg.HeightM, 16, 6);
            var m = new Material(ctx.TerrainMaterial) { name = "PlayerBody" };
            m.SetTexture("_BaseMap", null);
            m.SetColor("_BaseColor", new Color(0.85f, 0.45f, 0.2f)); // cùng shader và từ khoá với vật liệu địa hình (đã làm ấm)
            body.AddComponent<MeshRenderer>().sharedMaterial = m;
        }

        /// <summary>Lưới viên nang đứng, chân ở y = 0: vòng theo kinh tuyến (seg) × vĩ tuyến mỗi bán cầu (rings).</summary>
        public static Mesh CapsuleMesh(float r, float h, int seg, int rings)
        {
            var v = new System.Collections.Generic.List<Vector3>();
            var n = new System.Collections.Generic.List<Vector3>();
            var t = new System.Collections.Generic.List<int>();
            float half = Mathf.Max(0, h * 0.5f - r);
            int rows = rings * 2 + 2; // bán cầu dưới (rings+1 hàng) + bán cầu trên (rings+1 hàng)
            for (int i = 0; i < rows; i++)
            {
                bool top = i > rings;
                float a = (top ? i - 1 : i) / (float)(rings * 2) * Mathf.PI - Mathf.PI * 0.5f; // −90° … 90°
                float y = Mathf.Sin(a) * r + (top ? half : -half) + h * 0.5f, rr = Mathf.Cos(a) * r;
                for (int j = 0; j <= seg; j++)
                {
                    float b = j / (float)seg * Mathf.PI * 2f;
                    var dir = new Vector3(Mathf.Cos(b) * Mathf.Cos(a), Mathf.Sin(a), Mathf.Sin(b) * Mathf.Cos(a));
                    v.Add(new Vector3(Mathf.Cos(b) * rr, y, Mathf.Sin(b) * rr));
                    n.Add(dir);
                }
            }
            for (int i = 0; i < rows - 1; i++)
                for (int j = 0; j < seg; j++)
                {
                    int a0 = i * (seg + 1) + j, a1 = a0 + 1, b0 = a0 + seg + 1, b1 = b0 + 1;
                    t.Add(a0); t.Add(b0); t.Add(a1);
                    t.Add(a1); t.Add(b0); t.Add(b1);
                }
            var mesh = new Mesh { name = "player-capsule" };
            mesh.SetVertices(v); mesh.SetNormals(n); mesh.SetTriangles(t, 0);
            return mesh;
        }

        public override void Dispose() => controller?.Destroy();
    }
}
