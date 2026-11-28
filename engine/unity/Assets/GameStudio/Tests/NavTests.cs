// T-0019 (PSC-CHR-07, CFG-CHR-06, DTO-CHR-06): thứ tự ô, hàng đợi một việc, LRU 2 zone, đọc nav/sources.json.
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace GameStudio.Tests
{
    public class NavTests
    {
        /// <summary>Lưới 4×4 ô từ (-2,-2) như zone 16 chunk của POC S1.</summary>
        static List<NavTile> Grid()
        {
            var l = new List<NavTile>();
            for (int z = -2; z < 2; z++) for (int x = -2; x < 2; x++) l.Add(new NavTile { X = x, Z = z });
            return l;
        }

        static List<NavJob> Drain(NavTileQueue q)
        {
            var r = new List<NavJob>();
            while (q.TryNext(out var j)) { r.Add(j); q.Complete(j); }
            return r;
        }

        [Test]
        public void O_nguoi_choi_roi_o_ke_truoc_roi_theo_khoang_cach()
        {
            var tiles = Grid();
            var q = new NavTileQueue(tiles, 2, 0, 0);
            var jobs = Drain(q);
            Assert.AreEqual(32, jobs.Count);
            // Ô chứa người chơi (0,0), đủ hai họ, trước tiên.
            Assert.AreEqual((0, 0), (tiles[jobs[0].Tile].X, tiles[jobs[0].Tile].Z));
            Assert.AreEqual(jobs[0].Tile, jobs[1].Tile);
            Assert.AreEqual(new[] { 0, 1 }, new[] { jobs[0].Agent, jobs[1].Agent });
            // 8 ô kề (vòng 1) xong trước mọi ô vòng 2: 9 ô × 2 họ = 18 việc đầu.
            for (int i = 0; i < 18; i++)
            {
                var t = tiles[jobs[i].Tile];
                Assert.LessOrEqual(Mathf.Max(Mathf.Abs(t.X), Mathf.Abs(t.Z)), 1, "việc " + i);
            }
            // Trong vòng 1: ô cạnh (khoảng cách 1) trước ô chéo (khoảng cách √2).
            var t2 = tiles[jobs[2].Tile];
            Assert.AreEqual(1, Mathf.Abs(t2.X) + Mathf.Abs(t2.Z));
            Assert.IsTrue(q.AllDone);
        }

        [Test]
        public void Toi_da_mot_viec_dang_dung()
        {
            var q = new NavTileQueue(Grid(), 1, 0, 0);
            Assert.IsTrue(q.TryNext(out var a));
            Assert.IsFalse(q.TryNext(out _));
            Assert.AreEqual(1, q.InFlight);
            q.Complete(a);
            Assert.IsTrue(q.TryNext(out var b));
            Assert.AreNotEqual(a.Tile, b.Tile);
            Assert.IsTrue(q.IsDone(a.Tile, 0));
            Assert.IsFalse(q.IsDone(b.Tile, 0));
        }

        [Test]
        public void Doi_o_nguoi_choi_thi_xep_lai_phan_chua_dung_va_requeue_dung_dau()
        {
            var tiles = Grid();
            var q = new NavTileQueue(tiles, 1, 0, 0);
            Assert.IsTrue(q.TryNext(out var a));
            q.Complete(a);
            q.Reorder(-2, -2);
            Assert.IsTrue(q.TryNext(out var b));
            Assert.AreEqual((-2, -2), (tiles[b.Tile].X, tiles[b.Tile].Z));
            q.Requeue(b);
            Assert.AreEqual(0, q.InFlight);
            Assert.IsTrue(q.TryNext(out var c));
            Assert.AreEqual(b.Tile, c.Tile);
            Assert.AreEqual(tiles.Count - 1, q.Pending + 1);
        }

        [Test]
        public void TileReady_can_du_ho_va_TileAt_ngoai_zone()
        {
            var q = new NavTileQueue(Grid(), 2, 0, 0);
            int t = q.TileAt(0, 0);
            Assert.AreEqual(-1, q.TileAt(5, 5));
            Assert.IsFalse(q.TileReady(-1));
            q.TryNext(out var a); q.Complete(a);
            Assert.IsFalse(q.TileReady(t));
            q.TryNext(out var b); q.Complete(b);
            Assert.IsTrue(q.TileReady(t));
        }

        [Test]
        public void Lru_giu_hai_zone_va_tra_zone_cu_nhat()
        {
            var lru = new NavZoneLru<string>(2);
            Assert.IsNull(lru.Put("a", "A"));
            Assert.IsNull(lru.Put("b", "B"));
            Assert.IsTrue(lru.TryGet("a", out var v)); // a mới dùng → b cũ nhất
            Assert.AreEqual("A", v);
            Assert.AreEqual("B", lru.Put("c", "C"));
            Assert.IsTrue(lru.Contains("a"));
            Assert.IsFalse(lru.Contains("b"));
            Assert.IsTrue(lru.Peek("c", out _));
            Assert.AreEqual("A", lru.Put("d", "D")); // Peek không đổi thứ tự: a cũ nhất
        }

        [Test]
        public void Doc_nav_sources_json()
        {
            const string json = "{\"schema\":\"nav-sources/1\",\"zone\":\"z1\",\"agentTypes\":[" +
                "{\"agentType\":\"nguoi\",\"radius\":0.3,\"height\":1.7,\"maxSlope\":40,\"maxClimb\":0.35}," +
                "{\"agentType\":\"gia_cam\",\"radius\":0.15,\"height\":0.4,\"maxSlope\":40,\"maxClimb\":0.2}]," +
                "\"voxelSize\":0.2,\"tileSize\":64,\"bounds\":{\"min\":[-128,-4,-128],\"max\":[128,44,128]}," +
                "\"tiles\":[{\"x\":-2,\"z\":-2,\"bounds\":{\"min\":[-128,-4,-128],\"max\":[-64,44,-64]}}]," +
                "\"sources\":[{\"kind\":\"terrain\",\"ref\":\"t\",\"area\":\"walkable\"}]}";
            var d = NavSourcesDoc.Parse(json);
            Assert.AreEqual("z1", d.Zone);
            Assert.AreEqual(2, d.Agents.Count);
            Assert.AreEqual(AgentType.GiaCam, d.Agents[1].Type);
            Assert.AreEqual(0.2f, d.VoxelSize, 1e-6f);
            Assert.AreEqual(new Vector3(-128, -4, -128), d.Tiles[0].Bounds.min);
            Assert.Throws<System.FormatException>(() => NavSourcesDoc.Parse("{\"schema\":\"nav-sources/2\"}"));
        }

        [Test]
        public void Mac_dinh_tu_bao_zone_va_tham_so_navslice()
        {
            var b = new Bounds(new Vector3(0, 0, 0), new Vector3(256, 10, 256));
            var d = NavSourcesDoc.FromBounds("z1", b, -5, 50);
            Assert.AreEqual(16, d.Tiles.Count);
            Assert.AreEqual(4, d.Agents.Count);
            Assert.AreEqual(new Vector3(-128, -5, -128), d.Bounds.min);
            Assert.AreEqual(32f, NavSystem.SliceFromQuery("?perf=1&navslice=32", 64f));
            Assert.AreEqual(64f, NavSystem.SliceFromQuery("?navslice=500", 64f));
            Assert.AreEqual(64f, NavSystem.SliceFromQuery("?perf=1", 64f));
        }
    }
}
