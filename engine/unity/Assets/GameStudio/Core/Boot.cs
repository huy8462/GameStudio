// T-0022, T-0019, T-0021 (MOD-RTM-01, IF-RTM-01, SEQ-RTM-01, STM-RTM-01; PSC-RTM-01; ERR-RTM-02, 03, 04): trình tự khởi động.
// chọn tier → nạp và kiểm manifest → tạo hệ thống theo Order → nạp core zone xuất phát → làm ấm shader → SanSang (trang hiện nút "Chơi").
using System;
using System.Threading.Tasks;
using UnityEngine; // GetAwaiter cho AsyncOperation
using UnityEngine.Networking;

namespace GameStudio
{
    public static class Boot
    {
        public static async Task<Engine> Run(EngineRunner host, BootOptions opt)
        {
            var mode = opt.ParsedMode;
            var ctx = new EngineContext
            {
                Camera = host.mainCamera,
                Clock = new GameClock(mode == Mode.Test),
                Bus = new EventBus(),
                Log = new UnityLog(),
                Mode = mode,
                Input = new InputState(),
                Perf = host.Perf,
                TerrainMaterial = host.terrainMaterial,
            };
            var engine = new Engine(ctx);
            host.Attach(engine);
            try
            {
                var table = TierTable.Parse(host.tierTable != null ? host.tierTable.text : "{}");
                var choice = Detect.Decide(Detect.Read(), table, opt.tier);

                GsBridge.Progress("manifest", 0, 1);
                var manifest = ManifestCheck.Parse(await Fetch(opt.manifestUrl));
                ctx.Manifest = manifest;
                GsBridge.Progress("manifest", 1, 1);

                var tier = Detect.ClampToAvailable(choice.Tier, manifest.Tiers);
                ApplyTier.Apply(tier, host.urpByTier, engine);
                ctx.Log.Info($"tier={TierNames.Key(tier)} reason={choice.Reason} manual={choice.Manual}");

                engine.Register(new InputSystemGs());
                engine.Register(new CameraPlayerSystem());
                engine.Register(new NavSystem()); // T-0019: NavMesh theo ô lúc nạp zone
                engine.Register(new RenderSystem());
                foreach (var m in manifest.Modules) engine.EnableModule(m);

                engine.BeginLoad();
                var zones = new ZoneStreamer(manifest, opt.manifestUrl, engine, host.transform);
                zones.Progress += (done, total) => GsBridge.Progress("core", done, total);
                ctx.Zones = zones;
                await zones.LoadStart(manifest.StartZone);

                // T-0021 (PSC-RTM-01): làm ấm shader của tier đã chọn, xong mới MarkReady (trang mới hiện nút "Chơi").
                GsBridge.Progress("warmup", 0, 1);
                var warm = await ShaderWarmup.Run(ctx.Tier);
                ctx.Perf?.Extra.Add("warmup", warm.Json());
                ctx.Log.Info($"warmup variants={warm.Variants} ms={warm.Ms:0} stepMax={warm.StepMsMax:0.0}");
                GsBridge.Progress("warmup", 1, 1);

                engine.MarkReady();
            }
            catch (ManifestException e)
            {
                // ERR-RTM-03: play chỉ hiện câu chung; dev/preview/test hiện đường dẫn trường.
                engine.Fail(mode == Mode.Play && e.Code == "ERR-RTM-03" ? "ERR-RTM-03 Dữ liệu game bị lỗi." : e.Code + " " + e.Message);
            }
            catch (Exception e)
            {
                ctx.Log.Error(e.ToString());
                engine.Fail(e.Message);
            }
            return engine;
        }

        static async Task<string> Fetch(string url)
        {
            if (string.IsNullOrEmpty(url)) throw new InvalidOperationException("Thiếu manifestUrl");
            using var req = UnityWebRequest.Get(url);
            await req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success)
                throw new InvalidOperationException($"ERR-RTM-02 không tải được manifest: {req.error}");
            return req.downloadHandler.text;
        }
    }
}
