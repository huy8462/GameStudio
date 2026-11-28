// T-0028 (MOD-WLD-13 TerrainCollider; DDD-02 "MeshCollider LOD1"; PSC-CHR-02 CharacterController quét MeshCollider tĩnh).
// Dựng MeshCollider từ lưới độ cao LOD1, chia ô theo tileM (mặc định 64 m = ô NavMesh, T-0019) để chỉ số 16 bit, AABB
// nhỏ cho truy vấn vật lý và để NavMeshZoneBuilder lọc nguồn theo ô. Tên lớp tránh trùng UnityEngine.TerrainCollider.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace GameStudio
{
    public static class TerrainColliderBuilder
    {
        public const float TileM = 64f;

        /// <summary>Tạo GameObject "collider:&lt;cx&gt;_&lt;cz&gt;" có MeshCollider dưới parent; trả số ô.</summary>
        public static int Build(HeightGrid g, Transform parent, float tileM = TileM)
        {
            int step = Mathf.Max(1, Mathf.RoundToInt(tileM / g.CellM));
            int tiles = 0;
            var verts = new List<Vector3>((step + 1) * (step + 1));
            var idx = new List<int>(step * step * 6);
            for (int r0 = 0; r0 < g.Height - 1; r0 += step)
            {
                for (int c0 = 0; c0 < g.Width - 1; c0 += step)
                {
                    int c1 = Mathf.Min(c0 + step, g.Width - 1), r1 = Mathf.Min(r0 + step, g.Height - 1);
                    int w = c1 - c0 + 1;
                    verts.Clear(); idx.Clear();
                    for (int r = r0; r <= r1; r++)
                        for (int c = c0; c <= c1; c++)
                            verts.Add(new Vector3(g.X0 + c * g.CellM, g.H[r * g.Width + c], g.Z0 + r * g.CellM));
                    for (int r = 0; r < r1 - r0; r++)
                    {
                        for (int c = 0; c < c1 - c0; c++)
                        {
                            int a = r * w + c, b = a + 1, d = a + w, e = d + 1;
                            // Mặt hướng +Y (Unity: thứ tự cùng chiều kim đồng hồ khi nhìn từ trên).
                            idx.Add(a); idx.Add(d); idx.Add(b);
                            idx.Add(b); idx.Add(d); idx.Add(e);
                        }
                    }
                    var mesh = new Mesh { name = $"collider-lod1-{c0}-{r0}", indexFormat = IndexFormat.UInt16 };
                    mesh.SetVertices(verts);
                    mesh.SetTriangles(idx, 0, true);
                    int cx = Mathf.FloorToInt((g.X0 + c0 * g.CellM) / tileM), cz = Mathf.FloorToInt((g.Z0 + r0 * g.CellM) / tileM);
                    var go = new GameObject($"collider:{cx}_{cz}");
                    go.transform.SetParent(parent, false);
                    go.AddComponent<MeshCollider>().sharedMesh = mesh;
                    tiles++;
                }
            }
            return tiles;
        }
    }
}
