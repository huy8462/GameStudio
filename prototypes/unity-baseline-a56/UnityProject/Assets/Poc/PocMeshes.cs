// POC-U1 (CR-02, ADR-036): lưới thủ tục cho cảnh đo (asset bằng code, QĐ-08).
using UnityEngine;

public static class PocMeshes
{
    /// <summary>Cầu UV: rings × segs ô, khoảng 2·rings·segs tam giác (24 × 32 ≈ 1,5 nghìn).</summary>
    public static Mesh UvSphere(int rings, int segs, float r)
    {
        var v = new Vector3[(rings + 1) * (segs + 1)];
        var n = new Vector3[v.Length];
        var uv = new Vector2[v.Length];
        for (int i = 0, k = 0; i <= rings; i++)
        {
            float t = Mathf.PI * i / rings;
            for (int j = 0; j <= segs; j++, k++)
            {
                float p = 2 * Mathf.PI * j / segs;
                n[k] = new Vector3(Mathf.Sin(t) * Mathf.Cos(p), Mathf.Cos(t), Mathf.Sin(t) * Mathf.Sin(p));
                v[k] = n[k] * r;
                uv[k] = new Vector2((float)j / segs, (float)i / rings);
            }
        }
        var idx = new int[rings * segs * 6];
        for (int i = 0, q = 0; i < rings; i++)
            for (int j = 0; j < segs; j++)
            {
                int a = i * (segs + 1) + j, b = a + segs + 1;
                idx[q++] = a; idx[q++] = a + 1; idx[q++] = b;
                idx[q++] = b; idx[q++] = a + 1; idx[q++] = b + 1;
            }
        var m = new Mesh { name = "poc-sphere", vertices = v, normals = n, uv = uv, triangles = idx };
        m.RecalculateBounds();
        return m;
    }
}
