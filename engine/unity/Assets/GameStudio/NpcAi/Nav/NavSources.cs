// T-0019 (DTO-CHR-06, SCH-CHR-06 theo DDD-05, CFG-CHR-06): đọc nav/sources.json (nav-sources/1) của bước navmesh.
// Zone không có tệp này (dữ liệu cũ) thì dựng mặc định từ bao zone: ô 64 m, 4 họ tác nhân như agent-types.ts.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace GameStudio
{
    /// <summary>Thứ tự = AGENT_TYPES của bước navmesh (IF-CHR-02).</summary>
    public enum AgentType : byte { Nguoi, Thu4Nho, Thu4Lon, GiaCam }

    public struct AgentSpec
    {
        public AgentType Type;
        public float Radius, Height, MaxSlope, MaxClimb;
    }

    public struct NavTile
    {
        public int X, Z;
        public Bounds Bounds;
    }

    public sealed class NavSourcesDoc
    {
        public const string Schema = "nav-sources/1";
        public const float DefaultVoxel = 0.2f, DefaultTile = 64f;

        public string Zone = "";
        public float VoxelSize = DefaultVoxel, TileSize = DefaultTile;
        public Bounds Bounds;
        public readonly List<AgentSpec> Agents = new List<AgentSpec>(4);
        public readonly List<NavTile> Tiles = new List<NavTile>(64);

        public static readonly AgentSpec[] DefaultAgents =
        {
            new AgentSpec { Type = AgentType.Nguoi, Radius = 0.3f, Height = 1.7f, MaxSlope = 40f, MaxClimb = 0.35f },
            new AgentSpec { Type = AgentType.Thu4Nho, Radius = 0.25f, Height = 0.6f, MaxSlope = 45f, MaxClimb = 0.3f },
            new AgentSpec { Type = AgentType.Thu4Lon, Radius = 0.6f, Height = 1.6f, MaxSlope = 35f, MaxClimb = 0.4f },
            new AgentSpec { Type = AgentType.GiaCam, Radius = 0.15f, Height = 0.4f, MaxSlope = 40f, MaxClimb = 0.2f },
        };

        public static AgentType ParseAgent(string s) => s switch
        {
            "nguoi" => AgentType.Nguoi,
            "thu4_nho" => AgentType.Thu4Nho,
            "thu4_lon" => AgentType.Thu4Lon,
            "gia_cam" => AgentType.GiaCam,
            _ => throw new FormatException("agentType lạ: " + s),
        };

        public static NavSourcesDoc Parse(string json)
        {
            var o = MiniJson.Obj(MiniJson.Parse(json)) ?? throw new FormatException("nav/sources.json phải là object");
            if (MiniJson.Str(o, "schema") != Schema) throw new FormatException("cần schema " + Schema);
            var d = new NavSourcesDoc
            {
                Zone = MiniJson.Str(o, "zone") ?? "",
                VoxelSize = (float)MiniJson.Num(o, "voxelSize", DefaultVoxel),
                TileSize = (float)MiniJson.Num(o, "tileSize", DefaultTile),
                Bounds = Box(MiniJson.Obj(o.TryGetValue("bounds", out var bv) ? bv : null)),
            };
            foreach (var a in MiniJson.Arr(o.TryGetValue("agentTypes", out var av) ? av : null) ?? new List<object>())
            {
                var x = MiniJson.Obj(a);
                d.Agents.Add(new AgentSpec
                {
                    Type = ParseAgent(MiniJson.Str(x, "agentType")),
                    Radius = (float)MiniJson.Num(x, "radius"),
                    Height = (float)MiniJson.Num(x, "height"),
                    MaxSlope = (float)MiniJson.Num(x, "maxSlope"),
                    MaxClimb = (float)MiniJson.Num(x, "maxClimb"),
                });
            }
            foreach (var t in MiniJson.Arr(o.TryGetValue("tiles", out var tv) ? tv : null) ?? new List<object>())
            {
                var x = MiniJson.Obj(t);
                d.Tiles.Add(new NavTile
                {
                    X = (int)MiniJson.Num(x, "x"),
                    Z = (int)MiniJson.Num(x, "z"),
                    Bounds = Box(MiniJson.Obj(x.TryGetValue("bounds", out var b) ? b : null)),
                });
            }
            if (d.Agents.Count == 0 || d.Tiles.Count == 0) throw new FormatException("nav/sources.json thiếu agentTypes hoặc tiles");
            return d;
        }

        /// <summary>Mặc định khi zone không có nav/sources.json: ô lưới tileSize phủ bao xz của zone, y theo yMin..yMax.</summary>
        public static NavSourcesDoc FromBounds(string zone, Bounds zoneXZ, float yMin, float yMax, float tile = DefaultTile)
        {
            var d = new NavSourcesDoc { Zone = zone, TileSize = tile };
            d.Agents.AddRange(DefaultAgents);
            int x0 = Mathf.FloorToInt(zoneXZ.min.x / tile), x1 = Mathf.CeilToInt(zoneXZ.max.x / tile);
            int z0 = Mathf.FloorToInt(zoneXZ.min.z / tile), z1 = Mathf.CeilToInt(zoneXZ.max.z / tile);
            for (int z = z0; z < z1; z++)
                for (int x = x0; x < x1; x++)
                {
                    var b = new Bounds();
                    b.SetMinMax(new Vector3(x * tile, yMin, z * tile), new Vector3((x + 1) * tile, yMax, (z + 1) * tile));
                    d.Tiles.Add(new NavTile { X = x, Z = z, Bounds = b });
                }
            var all = new Bounds();
            all.SetMinMax(new Vector3(x0 * tile, yMin, z0 * tile), new Vector3(x1 * tile, yMax, z1 * tile));
            d.Bounds = all;
            return d;
        }

        static Bounds Box(Dictionary<string, object> o)
        {
            var b = new Bounds();
            if (o == null) return b;
            b.SetMinMax(V3(MiniJson.Arr(o.TryGetValue("min", out var mn) ? mn : null)), V3(MiniJson.Arr(o.TryGetValue("max", out var mx) ? mx : null)));
            return b;
        }

        static Vector3 V3(List<object> a) =>
            a != null && a.Count == 3 ? new Vector3((float)(double)a[0], (float)(double)a[1], (float)(double)a[2]) : Vector3.zero;
    }
}
