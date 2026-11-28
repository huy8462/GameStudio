// T-0022 (MOD-RTM-01, IF-RTM-02; DDD-04 §3.1): hợp đồng hệ thống của player và thứ tự chạy cố định.
using UnityEngine;

namespace GameStudio
{
    /// <summary>Chế độ chạy (IF-RTM-01): play | preview | test.</summary>
    public enum Mode { Play, Preview, Test }

    /// <summary>Thứ tự hệ thống (SRS-04 §2.1); số nhỏ chạy trước.</summary>
    public static class Order
    {
        public const int Input = 10, CameraPlayer = 20, NpcAi = 30, Characters = 40, Combat = 50,
            Interaction = 60, Fx = 70, Render = 80, UiAudio = 90;
    }

    /// <summary>Zone đã nạp xong phần core: gốc cảnh và bao của zone trong toạ độ thế giới.</summary>
    public sealed class LoadedZone
    {
        public string Id;
        public Transform Root;
        public Bounds Bounds;
    }

    /// <summary>Diff dữ liệu runtime (IF-RTM-04). Khung chỉ giữ chỗ; áp nóng thuộc phiếu xem trước.</summary>
    public struct RuntimeDataDiff
    {
        public int Version;
        public string OpsJson;
    }

    public interface ISystem
    {
        string Id { get; }
        int Order { get; }
        void Init(EngineContext ctx);
        void Tick(float dt, float t);
        void OnZoneLoaded(LoadedZone z);
        void OnZoneUnloaded(LoadedZone z);
        void OnRuntimeData(in RuntimeDataDiff diff);
        void OnTierChanged(Tier tier);
        void Dispose();
    }

    /// <summary>Lớp nền để hệ thống chỉ cần viết phần mình dùng.</summary>
    public abstract class SystemBase : ISystem
    {
        public abstract string Id { get; }
        public abstract int Order { get; }
        public virtual void Init(EngineContext ctx) { }
        public virtual void Tick(float dt, float t) { }
        public virtual void OnZoneLoaded(LoadedZone z) { }
        public virtual void OnZoneUnloaded(LoadedZone z) { }
        public virtual void OnRuntimeData(in RuntimeDataDiff diff) { }
        public virtual void OnTierChanged(Tier tier) { }
        public virtual void Dispose() { }
    }

    public interface ILog
    {
        void Info(string msg);
        void Warn(string msg);
        void Error(string msg);
    }

    public sealed class UnityLog : ILog
    {
        public void Info(string msg) => Debug.Log("GS " + msg);
        public void Warn(string msg) => Debug.LogWarning("GS " + msg);
        public void Error(string msg) => Debug.LogError("GS " + msg);
    }
}
