// T-0028 (MOD-CHR-02 ThirdPersonCamera, PSC-CHR-03 ALG-CHR-03; FR-CHR-02).
// Neo = chân + 0,9·chiều cao + lệch phải 0,35; SphereCast r 0,2 từ neo về vị trí mong muốn: kéo gần ngay, ra xa mượt
// (smoothDamp 0,1 s); không thấp hơn mặt đất + 0,3 m. Chưa có: ngôi một (head-bob), độ nhạy theo cài đặt (UI sau).
using UnityEngine;

namespace GameStudio
{
    public sealed class ThirdPersonCamera
    {
        public const float Distance = 3.5f, PitchMin = -60f, PitchMax = 70f, Probe = 0.2f, Smooth = 0.1f;

        public float Yaw, Pitch = 15f;
        float camDist = Distance, camVel;
        readonly float heightM;
        readonly int mask;
        readonly RaycastHit[] hits = new RaycastHit[8]; // không cấp phát trong Tick (FR-RTM-23)

        public ThirdPersonCamera(float heightM, int mask = Physics.DefaultRaycastLayers)
        {
            this.heightM = heightM;
            this.mask = mask;
        }

        public void AddLook(Vector2 look)
        {
            Yaw += look.x;
            Pitch = Mathf.Clamp(Pitch - look.y, PitchMin, PitchMax);
        }

        /// <summary>Đặt camera theo người chơi; terrain có thể null. Trả vị trí camera.</summary>
        public Vector3 Place(Camera cam, Transform player, TerrainHeights terrain, float dt, Collider ignore = null)
        {
            var rot = Quaternion.Euler(Pitch, Yaw, 0);
            var forward = rot * Vector3.forward;
            var right = Quaternion.Euler(0, Yaw, 0) * Vector3.right;
            var anchor = player.position + Vector3.up * (heightM * 0.9f) + right * 0.35f;

            float want = Distance;
            int nh = Physics.SphereCastNonAlloc(anchor, Probe, -forward, hits, Distance, mask, QueryTriggerInteraction.Ignore);
            for (int i = 0; i < nh; i++)
                if (hits[i].collider != ignore && hits[i].distance > 0) want = Mathf.Min(want, Mathf.Max(0.3f, hits[i].distance - 0.05f));

            if (want < camDist || dt <= 0) { camDist = want; camVel = 0; } // kéo gần ngay
            else camDist = Mathf.SmoothDamp(camDist, want, ref camVel, Smooth, Mathf.Infinity, dt);

            var pos = anchor - forward * camDist;
            if (terrain != null)
            {
                float g = terrain.HeightAt(pos.x, pos.z);
                if (!float.IsNaN(g)) pos.y = Mathf.Max(pos.y, g + 0.3f);
            }
            if (cam != null) cam.transform.SetPositionAndRotation(pos, Quaternion.LookRotation(anchor - pos, Vector3.up));
            return pos;
        }
    }
}
