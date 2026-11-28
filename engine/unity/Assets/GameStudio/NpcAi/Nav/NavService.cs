// T-0019 (MOD-CHR-10, IF-CHR-02 phần NavMesh sẵn sàng, PSC-CHR-07, OIT-CHR-01): NavService và hệ thống npc-ai (order 30)
// lo dựng NavMesh lúc nạp zone. NavPump (MonoBehaviour ẩn) đẩy việc dựng mỗi khung, kể cả khi màn nạp chưa bấm "Chơi".
// Số đo ghi vào Perf.Extra["navmesh"]. Tìm đường, crowd, kẹt (phần còn lại PSC-CHR-07) thuộc phiếu NPC E6.
using System.Globalization;
using UnityEngine;
using UnityEngine.AI;

namespace GameStudio
{
    public sealed class NavService
    {
        public readonly NavMeshZoneBuilder Builder = new NavMeshZoneBuilder();

        public bool ZoneReady(string zoneId) => Builder.ZoneReady(zoneId);

        /// <summary>Agent ở ô chưa dựng xong phải đứng Idle (PSC-CHR-07).</summary>
        public bool TileReady(Vector3 p, AgentType t) => Builder.TileReady(p, t);

        public bool NearestValid(Vector3 p, AgentType t, out Vector3 q, float maxDist = 4f)
        {
            q = p;
            int id = Builder.AgentTypeId(t);
            if (id < 0 || !NavMesh.SamplePosition(p, out var hit, maxDist, new NavMeshQueryFilter { agentTypeID = id, areaMask = NavMesh.AllAreas })) return false;
            q = hit.position;
            return true;
        }

        public bool FindPath(Vector3 from, Vector3 to, AgentType t, NavMeshPath outPath)
        {
            int id = Builder.AgentTypeId(t);
            return id >= 0 && NavMesh.CalculatePath(from, to, new NavMeshQueryFilter { agentTypeID = id, areaMask = NavMesh.AllAreas }, outPath)
                && outPath.status == NavMeshPathStatus.PathComplete;
        }
    }

    public sealed class NavSystem : SystemBase
    {
        public const string SourcesSuffix = "nav/sources.json";

        public override string Id => "npc-ai";
        public override int Order => GameStudio.Order.NpcAi;

        public readonly NavService Service = new NavService();
        EngineContext ctx;
        NavPump pump;
        string reported;

        public override void Init(EngineContext c)
        {
            ctx = c;
            c.Nav = Service;
            var go = new GameObject("NavPump") { hideFlags = HideFlags.HideInHierarchy };
            pump = go.AddComponent<NavPump>();
            pump.Owner = this;
            Service.Builder.SliceM = SliceFromQuery(GsBridge.Query(), Service.Builder.SliceM);
            Service.Builder.AgentLimit = Mathf.RoundToInt(QueryNum(GsBridge.Query(), "navagents", 0f, 0f, 4f));
        }

        public override void OnZoneLoaded(LoadedZone z)
        {
            var doc = Sources(z);
            var n = Service.Builder.Begin(z, doc, PlayerPos());
            ctx.Log.Info($"navmesh {z.Id}: {doc.Tiles.Count} ô × {doc.Agents.Count} họ, {n.Sources.Count} nguồn, lát {Service.Builder.SliceM} m");
        }

        public override void OnZoneUnloaded(LoadedZone z) => Service.Builder.Detach(z.Id);

        public override void Dispose()
        {
            if (pump != null) Object.Destroy(pump.gameObject);
        }

        internal void Frame(float unscaledDt)
        {
            Service.Builder.Pump(PlayerPos(), unscaledDt);
            var n = Service.Builder.Active;
            if (n == null || ctx.Perf == null) return;
            // Ghi khi có mốc mới (ô người chơi xong, zone xong), không tạo chuỗi mỗi khung.
            string key = n.Id + n.Jobs / 8 + (n.PlayerTileMs >= 0) + (n.ZoneMs >= 0);
            if (key == reported) return;
            reported = key;
            ctx.Perf.Extra["navmesh"] = Json(n);
        }

        /// <summary>?navslice=&lt;m&gt; (thử trên A56): cạnh lát dựng, 0 &lt; m ≤ 64.</summary>
        public static float SliceFromQuery(string q, float fallback) => QueryNum(q, "navslice", fallback, 0.001f, 64f);

        /// <summary>Số trong query (?key=v), ngoài [lo, hi] hoặc không có thì fallback.</summary>
        public static float QueryNum(string q, string key, float fallback, float lo, float hi)
        {
            int i = q.IndexOf(key + "=", System.StringComparison.Ordinal);
            if (i < 0) return fallback;
            int j = i + key.Length + 1, k = j;
            while (k < q.Length && q[k] != '&') k++;
            return float.TryParse(q.Substring(j, k - j), NumberStyles.Float, CultureInfo.InvariantCulture, out var v) && v >= lo && v <= hi ? v : fallback;
        }

        Vector3 PlayerPos() => ctx.Player != null ? ctx.Player.position : ctx.Manifest != null ? ctx.Manifest.SpawnPos : Vector3.zero;

        NavSourcesDoc Sources(LoadedZone z)
        {
            var entry = ctx.Manifest?.Zone(z.Id);
            if (entry != null && entry.Core.TryGetValue(TierNames.Key(ctx.Tier), out var files))
                foreach (var f in files)
                    if (f.Path.EndsWith(SourcesSuffix, System.StringComparison.Ordinal))
                    {
                        var text = ctx.Zones?.Text(f.Path);
                        if (text != null) return NavSourcesDoc.Parse(text);
                    }
            // Dữ liệu chưa có bước navmesh: ô 64 m phủ bao zone, y theo collider đã nạp.
            var b = z.Bounds;
            float y0 = -100f, y1 = 1000f;
            var cols = z.Root != null ? z.Root.GetComponentsInChildren<Collider>() : new Collider[0];
            if (cols.Length > 0)
            {
                var all = cols[0].bounds;
                foreach (var c in cols) all.Encapsulate(c.bounds);
                y0 = all.min.y - 1f; y1 = all.max.y + 3f;
            }
            return NavSourcesDoc.FromBounds(z.Id, b, y0, y1);
        }

        static string F(double v) => System.Math.Round(v, 1).ToString(CultureInfo.InvariantCulture);

        static string Json(ZoneNav n) =>
            "{\"zone\":\"" + n.Id + "\",\"tiles\":" + n.Doc.Tiles.Count + ",\"agentTypes\":" + n.Doc.Agents.Count +
            ",\"sources\":" + n.Sources.Count + ",\"jobs\":" + n.Jobs + ",\"jobsTotal\":" + n.Queue.Total +
            ",\"navmeshPlayerTileMs\":" + F(n.PlayerTileMs) + ",\"navmeshZoneMs\":" + F(n.ZoneMs) +
            ",\"navmeshTileMsMax\":" + F(n.JobMsMax) + ",\"callMsMax\":" + F(n.CallMsMax) +
            ",\"frameMsMaxWhileBuilding\":" + F(n.FrameMsMax) +
            ",\"framesOver33\":" + n.FramesOver33 + ",\"framesOver100\":" + n.FramesOver100 + "}";
    }

    /// <summary>Đẩy việc dựng NavMesh mỗi khung, độc lập với trạng thái Engine.</summary>
    public sealed class NavPump : MonoBehaviour
    {
        internal NavSystem Owner;
        void Update() => Owner?.Frame(Time.unscaledDeltaTime);
    }
}
