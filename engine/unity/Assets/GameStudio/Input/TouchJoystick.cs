// T-0022 (MOD-RTM-08; CFG-RTM-05): joystick ảo ở nửa trái màn hình. Bán kính 60 px (theo DPI 160), vùng chết 10 %.
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace GameStudio
{
    public sealed class TouchJoystick
    {
        public const float RadiusDp = 60f, DeadZone = 0.1f;

        int touchId = -1;
        Vector2 origin;

        public Vector2 Read(Touchscreen ts, float halfWidth)
        {
            float radius = RadiusDp * Mathf.Max(1f, Screen.dpi / 160f);
            var touches = ts.touches;
            TouchControl mine = null;
            for (int i = 0; i < touches.Count; i++)
            {
                var t = touches[i];
                if (!t.press.isPressed) continue;
                int id = t.touchId.ReadValue();
                if (id == touchId) { mine = t; break; }
                // Ngón mới chạm ở nửa trái thành gốc joystick.
                if (touchId < 0 && t.startPosition.ReadValue().x < halfWidth) { touchId = id; origin = t.startPosition.ReadValue(); mine = t; break; }
            }
            if (mine == null) { touchId = -1; return Vector2.zero; }
            var v = (mine.position.ReadValue() - origin) / radius;
            float len = v.magnitude;
            if (len < DeadZone) return Vector2.zero;
            return len > 1f ? v / len : v;
        }
    }

    /// <summary>Kéo ở nửa phải màn hình để nhìn.</summary>
    public sealed class TouchLook
    {
        public const float DegPerDp = 0.25f;

        int touchId = -1;

        public Vector2 Read(Touchscreen ts, float halfWidth)
        {
            float scale = DegPerDp / Mathf.Max(1f, Screen.dpi / 160f);
            var touches = ts.touches;
            for (int i = 0; i < touches.Count; i++)
            {
                var t = touches[i];
                if (!t.press.isPressed) continue;
                int id = t.touchId.ReadValue();
                if (id == touchId) return t.delta.ReadValue() * scale;
                if (touchId < 0 && t.startPosition.ReadValue().x >= halfWidth) { touchId = id; return Vector2.zero; }
            }
            // Ngón đang theo dõi đã nhấc (hoặc chưa có ngón nào ở nửa phải).
            touchId = -1;
            return Vector2.zero;
        }
    }
}
