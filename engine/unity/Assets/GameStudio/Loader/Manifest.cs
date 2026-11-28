// T-0022 (MOD-RTM-04 phía player, MOD-RTM-05; DTO-RTM-01, SCH-RTM-04; ERR-RTM-03, ERR-RTM-04): đọc manifest/1.
// Player chỉ kiểm schema, engineVersion và trường bắt buộc; kiểm đầy đủ bằng Ajv nằm ở build/CLI.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace GameStudio
{
    public sealed class FileRef
    {
        public string Path;
        public long Bytes;
        public string Sha256;
    }

    public sealed class ZoneEntry
    {
        public string Id;
        public Bounds Bounds;
        public string[] Neighbors = new string[0];
        /// <summary>parts[tier].core và parts[tier].full, khoá là tên tier trong dữ liệu ("thap", "vua"…).</summary>
        public readonly Dictionary<string, FileRef[]> Core = new Dictionary<string, FileRef[]>();
        public readonly Dictionary<string, FileRef[]> Full = new Dictionary<string, FileRef[]>();
    }

    public sealed class Manifest
    {
        public const string Schema = "manifest/1";

        public string GameId, EngineVersion, StartZone, SpawnZone;
        public int SchemaVersion;
        public string[] Tiers = new string[0];
        public Vector3 SpawnPos;
        public float SpawnYaw;
        public readonly List<ZoneEntry> Zones = new List<ZoneEntry>();
        public readonly HashSet<string> Modules = new HashSet<string>();

        public ZoneEntry Zone(string id)
        {
            for (int i = 0; i < Zones.Count; i++) if (Zones[i].Id == id) return Zones[i];
            return null;
        }
    }

    /// <summary>Lỗi dữ liệu manifest; Path là đường dẫn trường (ERR-RTM-03) để hiện ở mode dev/preview.</summary>
    public sealed class ManifestException : Exception
    {
        public readonly string Code, Path;
        public ManifestException(string code, string path, string msg) : base(msg) { Code = code; Path = path; }
    }

    public static class ManifestCheck
    {
        /// <summary>Phiên bản player (semver). Dữ liệu chạy được khi cùng major, và minor của dữ liệu ≤ minor của player.</summary>
        public const string PlayerVersion = "0.1.0";
        public const int SchemaVersion = 1;

        public static Manifest Parse(string json)
        {
            Dictionary<string, object> o;
            try { o = MiniJson.Obj(MiniJson.Parse(json)); }
            catch (FormatException e) { throw new ManifestException("ERR-RTM-03", "", e.Message); }
            if (o == null) throw Bad("", "manifest phải là object");
            if (MiniJson.Str(o, "schema") != Manifest.Schema) throw Bad("/schema", "cần " + Manifest.Schema);

            var m = new Manifest
            {
                GameId = Req(o, "gameId", ""),
                EngineVersion = Req(o, "engineVersion", ""),
                StartZone = Req(o, "startZone", ""),
            };
            if (!o.TryGetValue("schemaVersion", out var sv) || !(sv is double)) throw Bad("/schemaVersion", "thiếu");
            m.SchemaVersion = (int)(double)sv;
            if (m.SchemaVersion != SchemaVersion)
                throw new ManifestException("ERR-RTM-04", "/schemaVersion", $"schemaVersion {m.SchemaVersion}, player đọc {SchemaVersion}");
            if (!Compatible(m.EngineVersion, PlayerVersion))
                throw new ManifestException("ERR-RTM-04", "/engineVersion", $"engineVersion {m.EngineVersion}, player {PlayerVersion}");

            var tiers = MiniJson.Arr(o.TryGetValue("tiers", out var tv) ? tv : null);
            if (tiers == null || tiers.Count == 0) throw Bad("/tiers", "thiếu");
            m.Tiers = new string[tiers.Count];
            for (int i = 0; i < tiers.Count; i++) m.Tiers[i] = tiers[i] as string ?? throw Bad($"/tiers/{i}", "cần chuỗi");

            var spawn = MiniJson.Obj(o.TryGetValue("spawn", out var sp) ? sp : null);
            if (spawn == null) throw Bad("/spawn", "thiếu");
            m.SpawnZone = Req(spawn, "zone", "/spawn");
            m.SpawnPos = Vec3(spawn, "pos", "/spawn");
            m.SpawnYaw = (float)MiniJson.Num(spawn, "yaw");

            var zones = MiniJson.Arr(o.TryGetValue("zones", out var zv) ? zv : null);
            if (zones == null || zones.Count == 0) throw Bad("/zones", "thiếu");
            for (int i = 0; i < zones.Count; i++) m.Zones.Add(Zone(MiniJson.Obj(zones[i]), $"/zones/{i}"));
            if (m.Zone(m.StartZone) == null) throw Bad("/startZone", "không có trong zones");

            var mods = MiniJson.Obj(o.TryGetValue("modules", out var mv) ? mv : null);
            if (mods != null) foreach (var kv in mods) if (kv.Value is bool b && b) m.Modules.Add(kv.Key);
            return m;
        }

        /// <summary>Quy tắc caret: cùng major; major 0 thì cùng minor; còn lại minor dữ liệu ≤ minor player.</summary>
        public static bool Compatible(string data, string player)
        {
            if (!Semver(data, out int dM, out int dm) || !Semver(player, out int pM, out int pm)) return false;
            if (dM != pM) return false;
            return dM == 0 ? dm == pm : dm <= pm;
        }

        static bool Semver(string v, out int major, out int minor)
        {
            major = minor = 0;
            var p = (v ?? "").Split('.');
            return p.Length == 3 && int.TryParse(p[0], out major) && int.TryParse(p[1], out minor) && int.TryParse(p[2], out _);
        }

        static ZoneEntry Zone(Dictionary<string, object> o, string at)
        {
            if (o == null) throw Bad(at, "cần object");
            var z = new ZoneEntry { Id = Req(o, "id", at) };
            var b = MiniJson.Obj(o.TryGetValue("bounds", out var bv) ? bv : null);
            if (b == null) throw Bad(at + "/bounds", "thiếu");
            var min = Vec2(b, "min", at + "/bounds");
            var max = Vec2(b, "max", at + "/bounds");
            // bounds trong manifest là [x, z]; chiều cao lấy rộng để bao mọi địa hình.
            z.Bounds = new Bounds(new Vector3((min.x + max.x) * 0.5f, 0, (min.y + max.y) * 0.5f),
                new Vector3(max.x - min.x, 4000f, max.y - min.y));
            var n = MiniJson.Arr(o.TryGetValue("neighbors", out var nv) ? nv : null);
            if (n != null) { z.Neighbors = new string[n.Count]; for (int i = 0; i < n.Count; i++) z.Neighbors[i] = n[i] as string ?? ""; }
            var parts = MiniJson.Obj(o.TryGetValue("parts", out var pv) ? pv : null);
            if (parts == null) throw Bad(at + "/parts", "thiếu");
            foreach (var kv in parts)
            {
                var t = MiniJson.Obj(kv.Value) ?? throw Bad($"{at}/parts/{kv.Key}", "cần object");
                z.Core[kv.Key] = Files(t, "core", $"{at}/parts/{kv.Key}");
                z.Full[kv.Key] = Files(t, "full", $"{at}/parts/{kv.Key}");
            }
            return z;
        }

        static FileRef[] Files(Dictionary<string, object> o, string key, string at)
        {
            var a = MiniJson.Arr(o.TryGetValue(key, out var v) ? v : null);
            if (a == null) throw Bad($"{at}/{key}", "thiếu");
            var r = new FileRef[a.Count];
            for (int i = 0; i < a.Count; i++)
            {
                var f = MiniJson.Obj(a[i]) ?? throw Bad($"{at}/{key}/{i}", "cần object");
                r[i] = new FileRef { Path = Req(f, "path", $"{at}/{key}/{i}"), Bytes = (long)MiniJson.Num(f, "bytes"), Sha256 = MiniJson.Str(f, "sha256") };
            }
            return r;
        }

        static string Req(Dictionary<string, object> o, string key, string at)
        {
            var s = MiniJson.Str(o, key);
            if (string.IsNullOrEmpty(s)) throw Bad($"{at}/{key}", "thiếu");
            return s;
        }

        static Vector2 Vec2(Dictionary<string, object> o, string key, string at)
        {
            var a = MiniJson.Arr(o.TryGetValue(key, out var v) ? v : null);
            if (a == null || a.Count != 2 || !(a[0] is double) || !(a[1] is double)) throw Bad($"{at}/{key}", "cần [x, z]");
            return new Vector2((float)(double)a[0], (float)(double)a[1]);
        }

        static Vector3 Vec3(Dictionary<string, object> o, string key, string at)
        {
            var a = MiniJson.Arr(o.TryGetValue(key, out var v) ? v : null);
            if (a == null || a.Count != 3 || !(a[0] is double) || !(a[1] is double) || !(a[2] is double)) throw Bad($"{at}/{key}", "cần [x, y, z]");
            return new Vector3((float)(double)a[0], (float)(double)a[1], (float)(double)a[2]);
        }

        static ManifestException Bad(string path, string msg) => new ManifestException("ERR-RTM-03", path, $"{path}: {msg}");
    }
}
