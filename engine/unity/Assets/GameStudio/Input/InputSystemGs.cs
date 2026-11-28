// T-0022 (MOD-RTM-08 phần lõi, FR-RTM-15…17; CFG-RTM-05): hệ thống input (order 10) trên Unity Input System.
// Hợp nhất bàn phím/chuột và cảm ứng thành InputState. Chưa có: vẽ joystick, nút hành động trên màn hình (UI, phiếu sau).
using UnityEngine;
using UnityEngine.InputSystem;

namespace GameStudio
{
    /// <summary>Trạng thái input của khung hiện tại. Move: x phải, y tới, độ dài ≤ 1. Look: độ quay (độ) trong khung.</summary>
    public sealed class InputState
    {
        public Vector2 Move;
        public Vector2 Look;
        public bool Jump;
        public bool Interact;
        public bool Run;

        public void Clear() { Move = Vector2.zero; Look = Vector2.zero; Jump = false; Interact = false; Run = false; }
    }

    public sealed class InputSystemGs : SystemBase
    {
        public override string Id => "input";
        public override int Order => GameStudio.Order.Input;

        InputState state;
        readonly TouchJoystick joystick = new TouchJoystick();
        readonly TouchLook touchLook = new TouchLook();

        public override void Init(EngineContext ctx)
        {
            state = ctx.Input ?? (ctx.Input = new InputState());
        }

        public override void Tick(float dt, float t)
        {
            state.Clear();
            KeyboardMouse.Read(state);
            var ts = Touchscreen.current;
            if (ts != null)
            {
                float half = Screen.width * 0.5f;
                state.Move += joystick.Read(ts, half);
                state.Look += touchLook.Read(ts, half);
            }
            if (state.Move.sqrMagnitude > 1f) state.Move.Normalize();
        }
    }
}
