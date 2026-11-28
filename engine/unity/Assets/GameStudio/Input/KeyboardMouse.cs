// T-0022 (MOD-RTM-08): bàn phím (WASD/mũi tên, Shift chạy, Space nhảy, E tương tác) và chuột (giữ nút phải hoặc trái để nhìn).
using UnityEngine;
using UnityEngine.InputSystem;

namespace GameStudio
{
    public static class KeyboardMouse
    {
        public const float MouseDegPerPx = 0.15f;

        public static void Read(InputState s)
        {
            var k = Keyboard.current;
            if (k != null)
            {
                float x = (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1 : 0) - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1 : 0);
                float y = (k.wKey.isPressed || k.upArrowKey.isPressed ? 1 : 0) - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1 : 0);
                s.Move += new Vector2(x, y);
                s.Run |= k.leftShiftKey.isPressed;
                s.Jump |= k.spaceKey.wasPressedThisFrame;
                s.Interact |= k.eKey.wasPressedThisFrame;
            }
            var m = Mouse.current;
            // Khi có màn cảm ứng đang chạm, trình duyệt giả lập chuột từ ngón tay: bỏ qua để không nhìn hai lần.
            bool touching = Touchscreen.current != null && Touchscreen.current.primaryTouch.press.isPressed;
            if (m != null && !touching && (m.rightButton.isPressed || m.leftButton.isPressed))
                s.Look += m.delta.ReadValue() * MouseDegPerPx;
        }
    }
}
