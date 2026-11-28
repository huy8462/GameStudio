// T-0022 (MOD-RTM-07, PSC-RTM-01, ALG-RTM-01; DTO-RTM-04, EP-RTM-01 ?tier=): chọn tier khởi động.
// Decide là hàm thuần (test EditMode); Read lấy thông tin thiết bị qua gs-device.jslib.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace GameStudio
{
    public struct DeviceInfo
    {
        public string Gpu;
        public double MemoryGB;   // navigator.deviceMemory ?? 4
        public int Cores;
        public double ScreenPx;   // min(screen.w, screen.h) * dpr
        public string Saved;      // localStorage['gs.tier']
        public string Query;      // ?tier=
    }

    public sealed class TierRule
    {
        public string GpuRegex;
        public Tier Tier;
    }

    public sealed class TierTable
    {
        public readonly List<TierRule> Rules = new List<TierRule>();
        public double CaoMemMin = 12, VuaMemMin = 8, VuaScreenPxMin = 1080;

        public static TierTable Parse(string json)
        {
            var t = new TierTable();
            var o = MiniJson.Obj(MiniJson.Parse(json));
            var rules = MiniJson.Arr(o != null && o.TryGetValue("rules", out var rv) ? rv : null);
            if (rules != null)
                foreach (var r in rules)
                {
                    var ro = MiniJson.Obj(r);
                    if (ro == null || !TierNames.TryParse(MiniJson.Str(ro, "tier"), out var tier)) continue;
                    t.Rules.Add(new TierRule { GpuRegex = MiniJson.Str(ro, "gpuRegex") ?? "", Tier = tier });
                }
            var d = MiniJson.Obj(o != null && o.TryGetValue("defaults", out var dv) ? dv : null);
            if (d != null)
            {
                var cao = MiniJson.Obj(d.TryGetValue("cao", out var cv) ? cv : null);
                var vua = MiniJson.Obj(d.TryGetValue("vua", out var vv) ? vv : null);
                t.CaoMemMin = MiniJson.Num(cao, "deviceMemoryMin", t.CaoMemMin);
                t.VuaMemMin = MiniJson.Num(vua, "deviceMemoryMin", t.VuaMemMin);
                t.VuaScreenPxMin = MiniJson.Num(vua, "minScreenPx", t.VuaScreenPxMin);
            }
            return t;
        }
    }

    public struct TierChoice
    {
        public Tier Tier;
        public bool Manual;     // STM-RTM-03 ThuCong: người dùng/URL chọn, không tự hạ
        public string Reason;   // "query" | "saved" | "rule" | "memory" | "default"
    }

    public static class Detect
    {
        /// <summary>Thứ tự: BootOptions.tier / ?tier= → lựa chọn đã lưu → luật GPU → bộ nhớ và màn hình.</summary>
        public static TierChoice Decide(in DeviceInfo d, TierTable table, string bootTier)
        {
            if (TierNames.TryParse(bootTier, out var bt)) return new TierChoice { Tier = bt, Manual = true, Reason = "query" };
            if (TierNames.TryParse(d.Query, out var qt)) return new TierChoice { Tier = qt, Manual = true, Reason = "query" };
            if (TierNames.TryParse(d.Saved, out var st)) return new TierChoice { Tier = st, Manual = true, Reason = "saved" };
            if (!string.IsNullOrEmpty(d.Gpu))
                for (int i = 0; i < table.Rules.Count; i++)
                {
                    var r = table.Rules[i];
                    if (r.GpuRegex.Length > 0 && Regex.IsMatch(d.Gpu, r.GpuRegex, RegexOptions.IgnoreCase))
                        return new TierChoice { Tier = r.Tier, Reason = "rule" };
                }
            if (d.MemoryGB >= table.CaoMemMin) return new TierChoice { Tier = Tier.Cao, Reason = "memory" };
            if (d.MemoryGB >= table.VuaMemMin && d.ScreenPx >= table.VuaScreenPxMin) return new TierChoice { Tier = Tier.Vua, Reason = "memory" };
            return new TierChoice { Tier = Tier.Thap, Reason = "default" };
        }

        /// <summary>Tier chọn được phải có trong manifest.tiers; không có thì lấy bậc thấp hơn gần nhất, rồi bậc cao hơn gần nhất.</summary>
        public static Tier ClampToAvailable(Tier want, string[] available)
        {
            for (int t = (int)want; t >= 0; t--) if (Array.IndexOf(available, TierNames.Key((Tier)t)) >= 0) return (Tier)t;
            for (int t = (int)want + 1; t <= (int)Tier.ToiDa; t++) if (Array.IndexOf(available, TierNames.Key((Tier)t)) >= 0) return (Tier)t;
            return want;
        }

        public static DeviceInfo Read()
        {
            var d = new DeviceInfo { Gpu = SystemInfo.graphicsDeviceName, MemoryGB = 4, Cores = 4, ScreenPx = Mathf.Min(Screen.width, Screen.height) };
            try
            {
                var o = MiniJson.Obj(MiniJson.Parse(GsBridge.DeviceJson()));
                if (o == null) return d;
                d.Gpu = MiniJson.Str(o, "gpu") ?? d.Gpu;
                d.MemoryGB = MiniJson.Num(o, "deviceMemory", d.MemoryGB);
                d.Cores = (int)MiniJson.Num(o, "cores", d.Cores);
                d.ScreenPx = MiniJson.Num(o, "screenPx", d.ScreenPx);
                d.Saved = MiniJson.Str(o, "saved");
                d.Query = MiniJson.Str(o, "queryTier");
            }
            catch (FormatException) { /* giữ mặc định */ }
            return d;
        }
    }
}
