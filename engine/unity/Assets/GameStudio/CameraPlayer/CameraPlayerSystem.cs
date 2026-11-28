// T-0022 (TSD-00 §11 E2 "CameraPlayer, người chơi CharacterController"; SRS-04 §2.1 order 20; DTO-RTM-01 spawn).
// Người chơi là capsule CharacterController, camera góc nhìn thứ ba theo sau. Chưa có: mô hình nhân vật, hoạt ảnh,
// tránh camera xuyên địa hình bằng spherecast nhiều tia (phiếu nhân vật E4/E6).
using UnityEngine;

namespace GameStudio
{
    public sealed class CameraPlayerSystem : SystemBase
    {
        public const float WalkSpeed = 3.5f, RunSpeed = 7f, Gravity = -20f, JumpSpeed = 6f;
        public const float CamDistance = 6f, CamHeight = 1.6f, PitchMin = -20f, PitchMax = 70f;

        public override string Id => "camera-player";
        public override int Order => GameStudio.Order.CameraPlayer;

        EngineContext ctx;
        CharacterController body;
        float yaw, pitch = 15f, vy;
        bool placed;

        public Vector3 Position => body != null ? body.transform.position : Vector3.zero;

        public override void Init(EngineContext c)
        {
            ctx = c;
            var go = new GameObject("Player");
            body = go.AddComponent<CharacterController>();
            body.height = 1.8f; body.radius = 0.35f; body.center = new Vector3(0, 0.9f, 0);
            body.slopeLimit = 50f; body.stepOffset = 0.4f;
            body.enabled = false; // bật sau khi đặt lên mặt đất (zone xuất phát nạp xong)
            ctx.Player = go.transform;
            if (ctx.Manifest != null) { go.transform.position = ctx.Manifest.SpawnPos; yaw = ctx.Manifest.SpawnYaw; }
        }

        public override void OnZoneLoaded(LoadedZone z)
        {
            if (placed || ctx.Manifest == null || z.Id != ctx.Manifest.SpawnZone) return;
            // Đặt chân lên mặt đất tại spawn: dò từ trên xuống, không có collider thì giữ y của manifest.
            var p = ctx.Manifest.SpawnPos;
            if (Physics.Raycast(new Vector3(p.x, p.y + 2000f, p.z), Vector3.down, out var hit, 5000f)) p.y = hit.point.y + 0.05f;
            ctx.Player.position = p;
            body.enabled = true;
            placed = true;
            PlaceCamera();
        }

        public override void Tick(float dt, float t)
        {
            if (!placed) return;
            var input = ctx.Input;
            yaw += input.Look.x;
            pitch = Mathf.Clamp(pitch - input.Look.y, PitchMin, PitchMax);

            var rot = Quaternion.Euler(0, yaw, 0);
            var move = rot * new Vector3(input.Move.x, 0, input.Move.y) * (input.Run ? RunSpeed : WalkSpeed);
            if (body.isGrounded) vy = input.Jump ? JumpSpeed : -1f; else vy += Gravity * dt;
            move.y = vy;
            body.Move(move * dt);
            if (input.Move.sqrMagnitude > 0.01f) ctx.Player.rotation = rot;
            PlaceCamera();
        }

        void PlaceCamera()
        {
            var cam = ctx.Camera;
            if (cam == null || ctx.Perf != null && ctx.Perf.DrivingCamera) return;
            var target = ctx.Player.position + Vector3.up * CamHeight;
            var dir = Quaternion.Euler(pitch, yaw, 0) * Vector3.back;
            float dist = CamDistance;
            if (Physics.Raycast(target, dir, out var hit, CamDistance)) dist = Mathf.Max(0.5f, hit.distance - 0.2f);
            cam.transform.position = target + dir * dist;
            cam.transform.LookAt(target);
        }

        public override void Dispose()
        {
            if (ctx != null && ctx.Player != null) Object.Destroy(ctx.Player.gameObject);
        }
    }
}
