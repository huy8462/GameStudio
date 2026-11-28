// T-0028: HeightGrid (heightAt, normalAt), collider LOD1 theo ô, PlayerController (PSC-CHR-02, STM-CHR-01),
// ThirdPersonCamera (PSC-CHR-03). MOD-WLD-13, MOD-CHR-01, 02.
using System;
using NUnit.Framework;
using UnityEngine;

namespace GameStudio.Tests
{
    public class TerrainPlayerTests
    {
        GameObject root;

        [SetUp] public void SetUp() => root = new GameObject("test-root");
        [TearDown] public void TearDown()
        {
            UnityEngine.Object.DestroyImmediate(root);
            var p = GameObject.Find("Player");
            if (p != null) UnityEngine.Object.DestroyImmediate(p);
        }

        /// <summary>Lưới w×h ô cell m, gốc (x0, z0), độ cao f(x, z).</summary>
        static HeightGrid Grid(int w, int h, float cell, float x0, float z0, Func<float, float, float> f)
        {
            var d = new float[w * h];
            for (int r = 0; r < h; r++) for (int c = 0; c < w; c++) d[r * w + c] = f(x0 + c * cell, z0 + r * cell);
            return new HeightGrid(w, h, cell, x0, z0, d);
        }

        [Test]
        public void HeightGrid_ParseVaSongTuyen()
        {
            var vals = new float[] { 0, 1, 2, 3, 4, 5 }; // 3×2, độ cao = x/4 + 3·hàng
            var bytes = new byte[vals.Length * 4];
            Buffer.BlockCopy(vals, 0, bytes, 0, bytes.Length);
            var g = HeightGrid.Parse("{\"width\":3,\"height\":2,\"cellM\":4,\"originLocal\":[-4,10],\"minH\":0,\"maxH\":5}", bytes);
            Assert.AreEqual(3, g.Width); Assert.AreEqual(2, g.Height);
            Assert.AreEqual(0f, g.HeightAt(-4, 10), 1e-5f);
            Assert.AreEqual(1.5f, g.HeightAt(2, 10), 1e-5f);
            Assert.AreEqual(4f, g.HeightAt(0, 14), 1e-5f);
            Assert.AreEqual(3f, g.HeightAt(2, 12), 1e-5f);
            Assert.AreEqual(5f, g.HeightAt(100, 100), 1e-5f); // kẹp mép
            Assert.Throws<FormatException>(() => HeightGrid.Parse("{\"width\":3,\"height\":2,\"cellM\":4,\"originLocal\":[0,0]}", new byte[8]));
        }

        [Test]
        public void TerrainHeights_PhapTuyenVaNgoaiVung()
        {
            var t = new TerrainHeights();
            t.Set("z1", Grid(17, 17, 4, 0, 0, (x, z) => x)); // dốc 45° theo +x
            Assert.AreEqual(10f, t.HeightAt(10, 30), 1e-4f);
            Assert.IsTrue(float.IsNaN(t.HeightAt(-1, 0)));
            var n = t.NormalAt(30, 30);
            Assert.AreEqual(45f, Vector3.Angle(n, Vector3.up), 0.1f);
            Assert.Less(n.x, 0f);
            t.Remove("z1");
            Assert.AreEqual(0, t.Count);
        }

        [Test]
        public void ColliderLod1_ChiaO64mVaRaycastDungDoCao()
        {
            var g = Grid(33, 17, 4, -64, 0, (x, z) => 2f + 0.05f * x + 0.02f * z); // 128 × 64 m → 2 ô
            Assert.AreEqual(2, TerrainColliderBuilder.Build(g, root.transform));
            Physics.SyncTransforms();
            foreach (var mc in root.GetComponentsInChildren<MeshCollider>()) Assert.LessOrEqual(mc.sharedMesh.vertexCount, 17 * 17);
            Assert.IsTrue(Physics.Raycast(new Vector3(-20, 100, 30), Vector3.down, out var hit, 500f));
            Assert.AreEqual(g.HeightAt(-20, 30), hit.point.y, 1e-3f);
            Assert.AreEqual(0f, Vector3.Angle(hit.normal, g.NormalAt(-20, 30)), 0.5f);
        }

        PlayerController Player(HeightGrid g, Vector3 at)
        {
            var t = new TerrainHeights();
            t.Set("z1", g);
            TerrainColliderBuilder.Build(g, root.transform);
            Physics.SyncTransforms();
            var pc = new PlayerController(new PlayerConfig(), t);
            pc.Teleport(new Vector3(at.x, g.HeightAt(at.x, at.z) + 0.05f, at.z), 0);
            pc.Enable(true);
            return pc;
        }

        static void Run(PlayerController pc, InputState input, float seconds, float yaw = 0)
        {
            for (float t = 0; t < seconds; t += 1f / 30f) { pc.Tick(1f / 30f, input, yaw); Physics.SyncTransforms(); }
        }

        [Test]
        public void Player_DiChayDungTrenMatPhang()
        {
            var g = Grid(33, 33, 4, -64, -64, (x, z) => 1f);
            var pc = Player(g, Vector3.zero);
            var input = new InputState { Move = new Vector2(0, 1) };
            Run(pc, input, 1f);
            Assert.AreEqual(PlayerMoveState.Di, pc.State);
            Assert.AreEqual(3.5f * 1f, pc.Pos.z, 0.8f); // gần walk·t (trừ đoạn tăng tốc)
            Assert.AreEqual(1f, pc.Pos.y, 0.1f);
            input.Run = true;
            Run(pc, input, 0.5f);
            Assert.AreEqual(PlayerMoveState.Chay, pc.State);
            input.Move = Vector2.zero; input.Run = false;
            Run(pc, input, 1f);
            Assert.AreEqual(PlayerMoveState.Dung, pc.State);
            Assert.Less(pc.Vel.magnitude, 0.05f);
            // Input "tới" theo hướng camera 90° → đi theo +x.
            var x0 = pc.Pos.x;
            Run(pc, new InputState { Move = new Vector2(0, 1) }, 0.5f, 90f);
            Assert.Greater(pc.Pos.x - x0, 0.5f);
        }

        [Test]
        public void Player_BamDocVaTruotDocDung()
        {
            var gentle = Grid(33, 33, 4, -64, -64, (x, z) => 0.3f * z); // ~17°
            var pc = Player(gentle, Vector3.zero);
            Run(pc, new InputState { Move = new Vector2(0, 1) }, 1.5f);
            Assert.AreEqual(PlayerMoveState.Di, pc.State);
            Assert.AreEqual(gentle.HeightAt(pc.Pos.x, pc.Pos.z), pc.Pos.y, 0.15f);
            pc.Destroy();

            var steep = Grid(33, 33, 4, -64, -64, (x, z) => 1.5f * z); // ~56° > 45°
            pc = Player(steep, new Vector3(0, 0, 10));
            float z0 = pc.Pos.z;
            Run(pc, new InputState { Move = new Vector2(0, 1) }, 1f);
            Assert.AreEqual(PlayerMoveState.TruotDoc, pc.State);
            Assert.Less(pc.Pos.z, z0 + 0.5f); // không leo lên được
        }

        [Test]
        public void ThanTam_VienNangDungKichThuocVaPhapTuyenHuongRa()
        {
            var m = PlayerSystem.CapsuleMesh(0.35f, 1.8f, 16, 6);
            Assert.AreEqual(0f, m.bounds.min.y, 1e-4f);
            Assert.AreEqual(1.8f, m.bounds.max.y, 1e-4f);
            Assert.AreEqual(0.7f, m.bounds.size.x, 1e-3f);
            var v = m.vertices; var n = m.normals; var t = m.triangles;
            for (int i = 0; i < t.Length; i += 3)
            {
                var c = Vector3.Cross(v[t[i + 1]] - v[t[i]], v[t[i + 2]] - v[t[i]]);
                if (c.sqrMagnitude < 1e-10f) continue; // tam giác suy biến ở hai cực
                Assert.Greater(Vector3.Dot(c, n[t[i]] + n[t[i + 1]] + n[t[i + 2]]), 0f, "tam giác " + i / 3);
            }
            UnityEngine.Object.DestroyImmediate(m);
        }

        [Test]
        public void Camera_KeoGanKhiCoVatChan()
        {
            var g = Grid(33, 33, 4, -64, -64, (x, z) => 0f);
            var pc = Player(g, Vector3.zero);
            var cam = new ThirdPersonCamera(1.8f) { Yaw = 0, Pitch = 0 };
            var free = cam.Place(null, pc.Root, null, 0f);
            Assert.AreEqual(-3.5f, free.z, 0.05f);
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.transform.SetParent(root.transform);
            wall.transform.position = new Vector3(0.35f, 1.6f, -2f);
            Physics.SyncTransforms();
            var near = cam.Place(null, pc.Root, null, 0f, pc.Root.GetComponent<Collider>());
            Assert.Greater(near.z, -2f);
            cam.Pitch = -80; cam.AddLook(Vector2.zero);
            Assert.AreEqual(ThirdPersonCamera.PitchMin, cam.Pitch);
        }
    }
}
