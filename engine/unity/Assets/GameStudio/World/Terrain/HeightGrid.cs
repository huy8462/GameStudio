// T-0028 (MOD-WLD-13 phần heightAt/normalAt; DDD-02 TerrainSystem.heightAt; PSC-CHR-02 ground, PSC-CHR-03 cam.y).
// Lưới độ cao collider LOD1 do terrain.mesh ghi (collider/height-lod1.r32 float32 LE theo hàng z, + .meta.json
// {width, height, cellM, originLocal: [x0, z0], minH, maxH}). Truy vấn song tuyến, không cấp phát.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace GameStudio
{
    public sealed class HeightGrid
    {
        public readonly int Width, Height;
        public readonly float CellM, X0, Z0, MinH, MaxH;
        public readonly float[] H;

        public HeightGrid(int width, int height, float cellM, float x0, float z0, float[] h)
        {
            if (width < 2 || height < 2 || cellM <= 0 || h == null || h.Length != width * height)
                throw new ArgumentException($"lưới độ cao sai: {width}x{height}, cell {cellM}, {h?.Length ?? 0} giá trị");
            Width = width; Height = height; CellM = cellM; X0 = x0; Z0 = z0; H = h;
            float lo = float.PositiveInfinity, hi = float.NegativeInfinity;
            for (int i = 0; i < h.Length; i++) { lo = Mathf.Min(lo, h[i]); hi = Mathf.Max(hi, h[i]); }
            MinH = lo; MaxH = hi;
        }

        public float X1 => X0 + (Width - 1) * CellM;
        public float Z1 => Z0 + (Height - 1) * CellM;

        public bool Contains(float x, float z) => x >= X0 && x <= X1 && z >= Z0 && z <= Z1;

        /// <summary>Đọc từ .meta.json (MiniJson) và .r32. Lỗi định dạng → FormatException.</summary>
        public static HeightGrid Parse(string metaJson, byte[] r32)
        {
            var o = MiniJson.Obj(MiniJson.Parse(metaJson)) ?? throw new FormatException("meta collider không phải object");
            int w = (int)MiniJson.Num(o, "width"), h = (int)MiniJson.Num(o, "height");
            float cell = (float)MiniJson.Num(o, "cellM");
            var origin = MiniJson.Arr(o.TryGetValue("originLocal", out var ov) ? ov : null);
            if (origin == null || origin.Count != 2 || !(origin[0] is double) || !(origin[1] is double))
                throw new FormatException("meta collider thiếu originLocal [x, z]");
            if (r32 == null || r32.Length != w * h * 4)
                throw new FormatException($"height-lod1.r32 dài {r32?.Length ?? 0} byte, cần {w * h * 4}");
            var data = new float[w * h];
            Buffer.BlockCopy(r32, 0, data, 0, r32.Length); // WebGL và Windows đều little-endian
            return new HeightGrid(w, h, cell, (float)(double)origin[0], (float)(double)origin[1], data);
        }

        float At(int c, int r) => H[Mathf.Clamp(r, 0, Height - 1) * Width + Mathf.Clamp(c, 0, Width - 1)];

        /// <summary>Độ cao song tuyến tại (x, z); ngoài lưới thì kẹp về mép.</summary>
        public float HeightAt(float x, float z)
        {
            float fx = Mathf.Clamp((x - X0) / CellM, 0, Width - 1);
            float fz = Mathf.Clamp((z - Z0) / CellM, 0, Height - 1);
            int c = Mathf.Min((int)fx, Width - 2), r = Mathf.Min((int)fz, Height - 2);
            float tx = fx - c, tz = fz - r;
            float a = Mathf.Lerp(At(c, r), At(c + 1, r), tx);
            float b = Mathf.Lerp(At(c, r + 1), At(c + 1, r + 1), tx);
            return Mathf.Lerp(a, b, tz);
        }

        /// <summary>Pháp tuyến từ sai phân trung tâm (đơn vị).</summary>
        public Vector3 NormalAt(float x, float z)
        {
            float d = CellM;
            float dx = HeightAt(x + d, z) - HeightAt(x - d, z);
            float dz = HeightAt(x, z + d) - HeightAt(x, z - d);
            return new Vector3(-dx, 2f * d, -dz).normalized;
        }
    }

    /// <summary>Tập lưới độ cao theo zone (DDD-02 TerrainSystem.heightAt); ctx.Terrain.</summary>
    public sealed class TerrainHeights
    {
        readonly List<KeyValuePair<string, HeightGrid>> grids = new List<KeyValuePair<string, HeightGrid>>();

        public int Count => grids.Count;

        public void Set(string zone, HeightGrid g)
        {
            Remove(zone);
            grids.Add(new KeyValuePair<string, HeightGrid>(zone, g));
        }

        public void Remove(string zone)
        {
            for (int i = grids.Count - 1; i >= 0; i--) if (grids[i].Key == zone) grids.RemoveAt(i);
        }

        public HeightGrid Find(float x, float z)
        {
            for (int i = 0; i < grids.Count; i++) if (grids[i].Value.Contains(x, z)) return grids[i].Value;
            return null;
        }

        /// <summary>Độ cao tại (x, z), hoặc NaN khi không zone nào đã nạp phủ điểm đó.</summary>
        public float HeightAt(float x, float z) { var g = Find(x, z); return g != null ? g.HeightAt(x, z) : float.NaN; }

        public Vector3 NormalAt(float x, float z) { var g = Find(x, z); return g != null ? g.NormalAt(x, z) : Vector3.up; }
    }
}
