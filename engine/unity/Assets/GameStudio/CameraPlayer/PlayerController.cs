// T-0028 (MOD-CHR-01 PlayerController, PSC-CHR-02 ALG-CHR-02, STM-CHR-01; FR-CHR-01, 07…09; CR-02).
// Viên nang CharacterController: vận tốc ngang tắt dần về mong muốn (12/s), trọng lực 9,81, chia bước ≤ 0,25 m, bám đất
// theo TerrainHeights (bậc ≤ 0,35 m), dốc > maxSlopeDeg → TruotDoc. Chưa có: Ngoi, Boi (cần abilities, surface nước),
// kẹp trong playArea (manifest chưa có), bước chân (cần hoạt ảnh).
using UnityEngine;

namespace GameStudio
{
    /// <summary>STM-CHR-01.</summary>
    public enum PlayerMoveState : byte { Dung, Di, Chay, Nhay, Ngoi, Boi, TruotDoc }

    public sealed class PlayerConfig
    {
        public float HeightM = 1.8f, RadiusM = 0.35f, Walk = 3.5f, Run = 7f, JumpSpeed = 5f;
        public float MaxSlopeDeg = 45f, StepHeightM = 0.35f, Accel = 12f, Gravity = 9.81f;
        public bool CanJump = true;
    }

    public sealed class PlayerController
    {
        const float MaxStep = 0.25f;

        readonly PlayerConfig cfg;
        readonly CharacterController body;
        /// <summary>Độ cao địa hình (ctx.Terrain); null thì chỉ dựa vào CharacterController.</summary>
        public TerrainHeights Terrain;
        Vector3 vel;

        public PlayerMoveState State { get; private set; } = PlayerMoveState.Dung;
        public bool OnGround { get; private set; }
        public Vector3 Pos => body.transform.position;
        public Vector3 Vel => vel;
        public Transform Root => body.transform;

        public PlayerController(PlayerConfig cfg, TerrainHeights terrain)
        {
            this.cfg = cfg;
            Terrain = terrain;
            var go = new GameObject("Player");
            body = go.AddComponent<CharacterController>();
            body.height = cfg.HeightM; body.radius = cfg.RadiusM; body.center = new Vector3(0, cfg.HeightM * 0.5f, 0);
            body.slopeLimit = cfg.MaxSlopeDeg; body.stepOffset = cfg.StepHeightM; body.skinWidth = 0.03f;
            body.enabled = false;
        }

        public void Teleport(Vector3 p, float yaw)
        {
            bool was = body.enabled;
            body.enabled = false;
            body.transform.SetPositionAndRotation(p, Quaternion.Euler(0, yaw, 0));
            vel = Vector3.zero;
            body.enabled = was;
        }

        public void Enable(bool on) => body.enabled = on;

        /// <summary>PSC-CHR-02. camYaw: hướng camera (độ) làm cơ sở cho input.Move.</summary>
        public void Tick(float dt, InputState input, float camYaw)
        {
            if (!body.enabled || dt <= 0) return;
            var basis = Quaternion.Euler(0, camYaw, 0);
            var move = Vector2.ClampMagnitude(input.Move, 1f);
            bool moving = move.sqrMagnitude > 0.0001f;
            bool run = moving && input.Run;
            var wish = basis * new Vector3(move.x, 0, move.y) * (run ? cfg.Run : cfg.Walk);

            float k = 1f - Mathf.Exp(-cfg.Accel * dt);
            vel.x += (wish.x - vel.x) * k;
            vel.z += (wish.z - vel.z) * k;

            var n = Ground();
            float slope = Vector3.Angle(n, Vector3.up);
            bool steep = OnGround && slope > cfg.MaxSlopeDeg;
            if (steep)
            {
                // Chặn thành phần đi lên dốc, để trọng lực kéo trượt theo hướng dốc xuống.
                var down = new Vector3(n.x, 0, n.z).normalized;
                float up = -(vel.x * down.x + vel.z * down.z);
                if (up > 0) { vel.x += down.x * up; vel.z += down.z * up; }
            }

            if (OnGround && !steep && cfg.CanJump && input.Jump) { vel.y = cfg.JumpSpeed; OnGround = false; State = PlayerMoveState.Nhay; }
            else if (!OnGround || steep) vel.y -= cfg.Gravity * dt;
            else vel.y = -1f; // ép nhẹ xuống để CharacterController giữ isGrounded

            var disp = vel * dt;
            int steps = Mathf.Max(1, Mathf.CeilToInt(disp.magnitude / MaxStep));
            var stepV = disp / steps;
            CollisionFlags flags = CollisionFlags.None;
            for (int i = 0; i < steps; i++) flags |= body.Move(stepV);

            OnGround = (flags & CollisionFlags.Below) != 0 || body.isGrounded;
            SnapToGround();
            if (OnGround && vel.y < 0) vel.y = 0;
            if (moving) body.transform.rotation = Quaternion.Euler(0, Mathf.Atan2(wish.x, wish.z) * Mathf.Rad2Deg, 0);

            State = !OnGround ? PlayerMoveState.Nhay
                : steep ? PlayerMoveState.TruotDoc
                : !moving ? PlayerMoveState.Dung
                : run ? PlayerMoveState.Chay : PlayerMoveState.Di;
        }

        Vector3 Ground()
        {
            if (Terrain == null) return Vector3.up;
            var p = Pos;
            return Terrain.NormalAt(p.x, p.z);
        }

        /// <summary>Bám đất khi chân cách mặt địa hình ≤ StepHeightM và đang đi xuống (bậc nhỏ, đỉnh dốc).</summary>
        void SnapToGround()
        {
            if (Terrain == null || vel.y > 0) return;
            var p = Pos;
            float g = Terrain.HeightAt(p.x, p.z);
            if (float.IsNaN(g)) return;
            float gap = p.y - g;
            if (gap < -0.5f)
            {
                // Rơi xuyên đất (bước quá lớn hoặc collider chưa nạp): đặt lại lên mặt.
                Teleport(new Vector3(p.x, g + 0.05f, p.z), body.transform.eulerAngles.y);
                OnGround = true;
            }
            else if (gap <= cfg.StepHeightM && !OnGround)
            {
                body.Move(new Vector3(0, -gap, 0));
                OnGround = true;
            }
        }

        public void Destroy()
        {
            if (body == null) return;
            if (Application.isPlaying) Object.Destroy(body.gameObject); else Object.DestroyImmediate(body.gameObject);
        }
    }
}
