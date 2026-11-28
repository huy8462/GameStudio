// T-0022 (IF-RTM-01, EP-RTM-01; gs-bridge.jslib): lời gọi từ player ra trang nạp. Ngoài nền Web thì ghi log.
using System.Runtime.InteropServices;
using UnityEngine;

namespace GameStudio
{
    public static class GsBridge
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern double GsNowMs();
        [DllImport("__Internal")] static extern string GsQuery();
        [DllImport("__Internal")] static extern void GsProgress(string phase, int loaded, int total);
        [DllImport("__Internal")] static extern void GsState(string state, string message);
        [DllImport("__Internal")] static extern void GsPerfReport(string json);
        [DllImport("__Internal")] static extern string GsDeviceInfo();
#else
        static double GsNowMs() => Time.realtimeSinceStartupAsDouble * 1000.0;
        static string GsQuery() => "";
        static void GsProgress(string phase, int loaded, int total) { }
        static void GsState(string state, string message) => Debug.Log($"GS_STATE {state} {message}");
        static void GsPerfReport(string json) => Debug.Log("GS_PERF " + json);
        static string GsDeviceInfo() => "{}";
#endif

        /// <summary>Mili giây kể từ lúc trang bắt đầu điều hướng.</summary>
        public static double NowMs() => GsNowMs();
        public static string Query() => GsQuery() ?? "";
        public static void Progress(string phase, int loaded, int total) => GsProgress(phase, loaded, total);
        public static void State(EngineState state, string message = "") => GsState(state.ToString(), message ?? "");
        public static void PerfReport(string json) => GsPerfReport(json);
        public static string DeviceJson() => GsDeviceInfo() ?? "{}";

        public static bool QueryHas(string flag)
        {
            string q = Query();
            return q.Contains("?" + flag) || q.Contains("&" + flag);
        }
    }
}
