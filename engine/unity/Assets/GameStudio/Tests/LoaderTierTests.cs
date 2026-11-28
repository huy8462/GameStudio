// T-0022 (MOD-RTM-04, 05, 07; DTO-RTM-01, 04; PSC-RTM-01; ERR-RTM-03, 04): test EditMode cho manifest, JSON và chọn tier.
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace GameStudio.Tests
{
    public class LoaderTierTests
    {
        const string Good = @"{
          ""schema"": ""manifest/1"", ""gameId"": ""thu"", ""engineVersion"": ""0.1.0"", ""schemaVersion"": 1,
          ""tiers"": [""thap"", ""vua""], ""startZone"": ""z1"",
          ""spawn"": { ""zone"": ""z1"", ""pos"": [1, 2.5, -3], ""yaw"": 90 },
          ""zones"": [{ ""id"": ""z1"", ""bounds"": { ""min"": [-128, -64], ""max"": [128, 64] }, ""neighbors"": [""z2""],
            ""parts"": { ""vua"": { ""core"": [{ ""path"": ""zones/z1/a.glb"", ""bytes"": 123, ""sha256"": ""ab"" }], ""full"": [] } } }],
          ""modules"": { ""combat"": true, ""dialogueAi"": false }
        }";

        [Test]
        public void MiniJsonParsesValues()
        {
            var o = MiniJson.Obj(MiniJson.Parse(@"{""a"": [1, -2.5e1, true, null, ""x\né""], ""b"": {}}"));
            var a = MiniJson.Arr(o["a"]);
            Assert.AreEqual(1d, a[0]);
            Assert.AreEqual(-25d, a[1]);
            Assert.AreEqual(true, a[2]);
            Assert.IsNull(a[3]);
            Assert.AreEqual("x\né", a[4]);
            Assert.IsEmpty(MiniJson.Obj(o["b"]));
        }

        [TestCase("")]
        [TestCase("{")]
        [TestCase("[1,]")]
        [TestCase("{\"a\":1} x")]
        [TestCase("nul")]
        public void MiniJsonRejectsBadInput(string json)
        {
            Assert.Throws<System.FormatException>(() => MiniJson.Parse(json));
        }

        [Test]
        public void ManifestParsesRequiredFields()
        {
            var m = ManifestCheck.Parse(Good);
            Assert.AreEqual("thu", m.GameId);
            Assert.AreEqual(new Vector3(1, 2.5f, -3), m.SpawnPos);
            Assert.AreEqual(90f, m.SpawnYaw);
            var z = m.Zone("z1");
            Assert.AreEqual(new Vector3(256, 4000, 128), z.Bounds.size);
            Assert.AreEqual("zones/z1/a.glb", z.Core["vua"][0].Path);
            Assert.AreEqual(123, z.Core["vua"][0].Bytes);
            Assert.IsTrue(m.Modules.Contains("combat"));
            Assert.IsFalse(m.Modules.Contains("dialogueAi"));
        }

        [TestCase("\"gameId\": \"thu\",", "", "ERR-RTM-03", "/gameId")]
        [TestCase("\"schemaVersion\": 1", "\"schemaVersion\": 2", "ERR-RTM-04", "/schemaVersion")]
        [TestCase("\"engineVersion\": \"0.1.0\"", "\"engineVersion\": \"0.2.0\"", "ERR-RTM-04", "/engineVersion")]
        [TestCase("\"startZone\": \"z1\"", "\"startZone\": \"z9\"", "ERR-RTM-03", "/startZone")]
        [TestCase("\"min\": [-128, -64]", "\"min\": [-128]", "ERR-RTM-03", "/zones/0/bounds/min")]
        [TestCase("manifest/1", "manifest/2", "ERR-RTM-03", "/schema")]
        public void ManifestErrorsCarryCodeAndPath(string find, string replace, string code, string path)
        {
            var e = Assert.Throws<ManifestException>(() => ManifestCheck.Parse(Good.Replace(find, replace)));
            Assert.AreEqual(code, e.Code);
            Assert.AreEqual(path, e.Path);
        }

        [TestCase("0.1.0", "0.1.3", true)]
        [TestCase("0.1.0", "0.2.0", false)]
        [TestCase("1.2.0", "1.4.0", true)]
        [TestCase("1.5.0", "1.4.0", false)]
        [TestCase("2.0.0", "1.4.0", false)]
        [TestCase("abc", "1.4.0", false)]
        public void EngineVersionCaret(string data, string player, bool ok)
        {
            Assert.AreEqual(ok, ManifestCheck.Compatible(data, player));
        }

        static readonly TierTable Table = TierTable.Parse(@"{
          ""rules"": [{ ""gpuRegex"": ""Xclipse 5[0-9]{2}"", ""tier"": ""vua"" }, { ""gpuRegex"": ""SwiftShader"", ""tier"": ""thap"" }],
          ""defaults"": { ""cao"": { ""deviceMemoryMin"": 12 }, ""vua"": { ""deviceMemoryMin"": 8, ""minScreenPx"": 1080 } } }");

        [Test]
        public void TierDecisionOrder()
        {
            var a56 = new DeviceInfo { Gpu = "ANGLE (Samsung Xclipse 540) on Vulkan", MemoryGB = 8, ScreenPx = 1080 };
            Assert.AreEqual(Tier.Vua, Detect.Decide(a56, Table, "auto").Tier);
            Assert.AreEqual("rule", Detect.Decide(a56, Table, "auto").Reason);

            var boot = Detect.Decide(a56, Table, "cao");
            Assert.AreEqual(Tier.Cao, boot.Tier);
            Assert.IsTrue(boot.Manual);

            a56.Saved = "thap";
            Assert.AreEqual(Tier.Thap, Detect.Decide(a56, Table, null).Tier);
            a56.Query = "toi_da"; // ?tier= thắng lựa chọn đã lưu
            Assert.AreEqual(Tier.ToiDa, Detect.Decide(a56, Table, null).Tier);

            Assert.AreEqual(Tier.Cao, Detect.Decide(new DeviceInfo { Gpu = "Mali-G715", MemoryGB = 12, ScreenPx = 1440 }, Table, null).Tier);
            Assert.AreEqual(Tier.Vua, Detect.Decide(new DeviceInfo { Gpu = "Mali-G68", MemoryGB = 8, ScreenPx = 1080 }, Table, null).Tier);
            Assert.AreEqual(Tier.Thap, Detect.Decide(new DeviceInfo { Gpu = "Mali-G68", MemoryGB = 8, ScreenPx = 720 }, Table, null).Tier);
            Assert.AreEqual(Tier.Thap, Detect.Decide(new DeviceInfo { Gpu = "Google SwiftShader", MemoryGB = 32, ScreenPx = 2160 }, Table, null).Tier);
        }

        [Test]
        public void TierClampsToManifest()
        {
            Assert.AreEqual(Tier.Vua, Detect.ClampToAvailable(Tier.ToiDa, new[] { "thap", "vua" }));
            Assert.AreEqual(Tier.Vua, Detect.ClampToAvailable(Tier.Thap, new[] { "vua" }));
            Assert.AreEqual(Tier.Cao, Detect.ClampToAvailable(Tier.Cao, new[] { "vua", "cao" }));
        }

        [Test]
        public void TierNamesRoundTrip()
        {
            foreach (Tier t in System.Enum.GetValues(typeof(Tier)))
            {
                Assert.IsTrue(TierNames.TryParse(TierNames.Key(t), out var back));
                Assert.AreEqual(t, back);
            }
            Assert.IsFalse(TierNames.TryParse("auto", out _));
            Assert.IsFalse(TierNames.TryParse(null, out _));
        }
    }
}
