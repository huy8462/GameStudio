// T-0019 (MOD-CHR-10, PSC-CHR-07, CFG-CHR-06, OIT-CHR-01; POC-U1 Q6): dựng NavMeshData của zone theo ô 64 m, bất đồng bộ.
// Mỗi việc (ô × họ tác nhân) là một NavMeshBuilder.UpdateNavMeshDataAsync với bao của ô, tối đa 1 việc đang dựng;
// ô chứa người chơi và ô kề trước (NavTileQueue). Nguồn: MeshCollider của zone (collider địa hình), lọc theo ô.
// SliceM < TileSize chia một ô thành nhiều lát nhỏ hơn (dự phòng khi nền Web chạy việc dựng trên luồng chính).
// NavMeshData giữ trong phiên, LRU 2 zone: zone gỡ rồi nạp lại chỉ gắn lại, không dựng lại.
using System.Collections.Generic;
using System.Diagnostics;
using UnityEngine;
using UnityEngine.AI;

namespace GameStudio
{
    public sealed class ZoneNav
    {
        public string Id;
        public NavSourcesDoc Doc;
        public NavTileQueue Queue;
        public NavMeshData[] Data;
        public NavMeshDataInstance[] Instances;
        public readonly List<NavMeshBuildSource> Sources = new List<NavMeshBuildSource>();
        public readonly List<Bounds> SourceBounds = new List<Bounds>();
        public bool Attached;
        // Số đo (ms, tính từ lúc zone nạp xong).
        public double StartMs, PlayerTileMs = -1, ZoneMs = -1, JobMsMax, CallMsMax, FrameMsMax;
        public int Jobs, PlayerTile = -1, FramesOver33, FramesOver100;
    }

    public sealed class NavMeshZoneBuilder
    {
        public float SliceM = NavSourcesDoc.DefaultTile;
        /// <summary>Chỉ dựng N họ đầu (thử nghiệm ?navagents=N); 0 = tất cả.</summary>
        public int AgentLimit;

        readonly NavZoneLru<ZoneNav> cache = new NavZoneLru<ZoneNav>(2);
        readonly Dictionary<AgentType, NavMeshBuildSettings> settings = new Dictionary<AgentType, NavMeshBuildSettings>();
        readonly List<NavMeshBuildSource> scratch = new List<NavMeshBuildSource>(64);
        readonly Stopwatch clock = Stopwatch.StartNew();
        ZoneNav active;
        NavJob job;
        AsyncOperation op;
        double jobStart;
        int slice, slices;

        public double NowMs => clock.Elapsed.TotalMilliseconds;
        public ZoneNav Active => active;
        public bool Building => active != null && !active.Queue.AllDone;

        /// <summary>Zone nạp xong: zone đã có trong cache thì gắn lại, không thì thu nguồn và xếp hàng dựng.</summary>
        public ZoneNav Begin(LoadedZone z, NavSourcesDoc doc, Vector3 player)
        {
            Abandon();
            if (cache.TryGet(z.Id, out var hit))
            {
                Attach(hit);
                active = hit;
                return hit;
            }
            var n = new ZoneNav { Id = z.Id, Doc = doc, StartMs = NowMs };
            NavMeshBuilder.CollectSources(z.Root, ~0, NavMeshCollectGeometry.PhysicsColliders, 0, new List<NavMeshBuildMarkup>(), n.Sources);
            foreach (var s in n.Sources) n.SourceBounds.Add(WorldBounds(s));
            if (AgentLimit > 0 && doc.Agents.Count > AgentLimit) doc.Agents.RemoveRange(AgentLimit, doc.Agents.Count - AgentLimit);
            n.Data = new NavMeshData[doc.Agents.Count];
            n.Instances = new NavMeshDataInstance[doc.Agents.Count];
            for (int a = 0; a < doc.Agents.Count; a++) n.Data[a] = new NavMeshData(Settings(doc.Agents[a], doc.VoxelSize).agentTypeID);
            var pt = TileOf(doc, player);
            n.Queue = new NavTileQueue(doc.Tiles, doc.Agents.Count, pt.x, pt.y);
            n.PlayerTile = n.Queue.TileAt(pt.x, pt.y);
            Attach(n);
            var evicted = cache.Put(z.Id, n);
            if (evicted != null) Release(evicted);
            active = n;
            return n;
        }

        public void Detach(string zoneId)
        {
            if (active != null && active.Id == zoneId) { Abandon(); active = null; }
            if (cache.Peek(zoneId, out var n)) Detach(n);
        }

        /// <summary>Việc đang dựng của zone đang hoạt động trả lại hàng đợi; zone quay lại thì dựng tiếp từ đó.</summary>
        void Abandon()
        {
            if (active == null || op == null) return;
            active.Queue.Requeue(job);
            op = null;
        }

        public bool ZoneReady(string zoneId) => cache.Peek(zoneId, out var n) && n.Attached && n.Queue.AllDone;

        public int AgentTypeId(AgentType t) => settings.TryGetValue(t, out var s) ? s.agentTypeID : -1;

        /// <summary>Ô chứa p của zone đang dựng đã xong cho họ tác nhân t (agent ở ô chưa xong đứng Idle).</summary>
        public bool TileReady(Vector3 p, AgentType t)
        {
            if (active == null) return false;
            var c = TileOf(active.Doc, p);
            int tile = active.Queue.TileAt(c.x, c.y);
            int a = active.Doc.Agents.FindIndex(x => x.Type == t);
            return tile >= 0 && a >= 0 && active.Queue.IsDone(tile, a);
        }

        /// <summary>Gọi mỗi khung (kể cả lúc màn nạp): đo khung, xong việc thì bắt đầu việc kế tiếp.</summary>
        public void Pump(Vector3 player, float unscaledDt)
        {
            var n = active;
            if (n == null || n.Queue.AllDone) return;
            if (op != null || n.Queue.InFlight > 0)
            {
                double ms = unscaledDt * 1000.0;
                n.FrameMsMax = System.Math.Max(n.FrameMsMax, ms);
                if (ms > 33.4) n.FramesOver33++;
                if (ms > 100) n.FramesOver100++;
            }
            var pt = TileOf(n.Doc, player);
            n.Queue.Reorder(pt.x, pt.y);
            if (op != null && !op.isDone) return;
            if (op != null)
            {
                op = null;
                if (++slice < slices) { StartSlice(n); return; }
                n.Queue.Complete(job);
                n.Jobs++;
                n.JobMsMax = System.Math.Max(n.JobMsMax, NowMs - jobStart);
                if (n.PlayerTileMs < 0 && n.Queue.TileReady(n.PlayerTile)) n.PlayerTileMs = NowMs - n.StartMs;
                if (n.Queue.AllDone) { n.ZoneMs = NowMs - n.StartMs; return; }
            }
            if (!n.Queue.TryNext(out job)) return;
            jobStart = NowMs;
            int k = Mathf.Max(1, Mathf.RoundToInt(n.Doc.TileSize / Mathf.Max(1f, SliceM)));
            slices = k * k;
            slice = 0;
            StartSlice(n);
        }

        void StartSlice(ZoneNav n)
        {
            var tb = n.Doc.Tiles[job.Tile].Bounds;
            int k = Mathf.RoundToInt(Mathf.Sqrt(slices));
            float w = tb.size.x / k, d = tb.size.z / k;
            int ix = slice % k, iz = slice / k;
            var b = new Bounds();
            // Thu nhỏ 1 cm để không chạm ô kề của lưới tile nội bộ của Unity.
            b.SetMinMax(new Vector3(tb.min.x + ix * w + 0.01f, tb.min.y, tb.min.z + iz * d + 0.01f),
                new Vector3(tb.min.x + (ix + 1) * w - 0.01f, tb.max.y, tb.min.z + (iz + 1) * d - 0.01f));
            var probe = b;
            probe.Expand(new Vector3(2f, 0f, 2f)); // lề cho bán kính tác nhân ở mép
            scratch.Clear();
            for (int i = 0; i < n.Sources.Count; i++) if (n.SourceBounds[i].Intersects(probe)) scratch.Add(n.Sources[i]);
            var s = Settings(n.Doc.Agents[job.Agent], n.Doc.VoxelSize);
            double t0 = NowMs;
            op = NavMeshBuilder.UpdateNavMeshDataAsync(n.Data[job.Agent], s, scratch, b);
            n.CallMsMax = System.Math.Max(n.CallMsMax, NowMs - t0);
        }

        NavMeshBuildSettings Settings(AgentSpec a, float voxel)
        {
            if (settings.TryGetValue(a.Type, out var s)) return s;
            s = NavMesh.CreateSettings();
            s.agentRadius = a.Radius;
            s.agentHeight = a.Height;
            s.agentSlope = a.MaxSlope;
            s.agentClimb = a.MaxClimb;
            s.overrideVoxelSize = true;
            s.voxelSize = voxel;
            s.overrideTileSize = true;
            s.tileSize = 64; // voxel (PSC-CHR-07): 12,8 m, chia đều ô 64 m
            settings[a.Type] = s;
            return s;
        }

        static Vector2Int TileOf(NavSourcesDoc d, Vector3 p) =>
            new Vector2Int(Mathf.FloorToInt(p.x / d.TileSize), Mathf.FloorToInt(p.z / d.TileSize));

        static void Attach(ZoneNav n)
        {
            if (n.Attached) return;
            for (int a = 0; a < n.Data.Length; a++) n.Instances[a] = NavMesh.AddNavMeshData(n.Data[a]);
            n.Attached = true;
        }

        static void Detach(ZoneNav n)
        {
            if (!n.Attached) return;
            for (int a = 0; a < n.Instances.Length; a++) n.Instances[a].Remove();
            n.Attached = false;
        }

        static void Release(ZoneNav n)
        {
            Detach(n);
            for (int a = 0; a < n.Data.Length; a++) if (n.Data[a] != null) Object.Destroy(n.Data[a]);
        }

        static Bounds WorldBounds(NavMeshBuildSource s)
        {
            Bounds local;
            if (s.shape == NavMeshBuildSourceShape.Mesh && s.sourceObject is Mesh m) local = m.bounds;
            else if (s.shape == NavMeshBuildSourceShape.Terrain && s.sourceObject is TerrainData td) local = new Bounds(td.size * 0.5f, td.size);
            else local = new Bounds(Vector3.zero, s.size);
            var c = s.transform.MultiplyPoint3x4(local.center);
            var e = local.extents;
            var m4 = s.transform;
            var ext = new Vector3(
                Mathf.Abs(m4.m00) * e.x + Mathf.Abs(m4.m01) * e.y + Mathf.Abs(m4.m02) * e.z,
                Mathf.Abs(m4.m10) * e.x + Mathf.Abs(m4.m11) * e.y + Mathf.Abs(m4.m12) * e.z,
                Mathf.Abs(m4.m20) * e.x + Mathf.Abs(m4.m21) * e.y + Mathf.Abs(m4.m22) * e.z);
            return new Bounds(c, ext * 2f);
        }
    }
}
