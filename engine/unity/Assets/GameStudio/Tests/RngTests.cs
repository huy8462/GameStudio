// T-0027 (TST-GEN-02, TC-GEN-02; MOD-GEN-01, 02; ALG-GEN-01; RR-CR02-04): C# khớp vector chuẩn của @gamestudio/rng.
// Vector: engine/shared/rng/vectors.json (sinh bởi engine/build/py/gen_rng_vectors.py), cùng tệp với test TS.
using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace GameStudio.Tests
{
    public class RngTests
    {
        static Dictionary<string, object> vectors;
        static Dictionary<string, object> V => vectors ??= MiniJson.Obj(MiniJson.Parse(VectorPath.Read("engine/shared/rng/vectors.json")));

        static uint U(object o) => (uint)(double)o;
        static long L(object o) => (long)(double)o;
        static List<object> A(object o) => (List<object>)o;
        static Dictionary<string, object> O(object o) => (Dictionary<string, object>)o;

        [Test]
        public void MatchesPcg32DemoReference()
        {
            var r = new Pcg32(42, 54);
            uint[] want = { 0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e };
            foreach (uint w in want) Assert.AreEqual(w, r.NextU32());
        }

        [Test]
        public void SequencesMatchVectors()
        {
            var seqs = A(V["sequences"]);
            Assert.GreaterOrEqual(seqs.Count, 5);
            foreach (var so in seqs)
            {
                var s = O(so);
                var r = new Pcg32(U(s["seed"]), U(s["stream"]));
                var u32 = A(s["u32"]);
                Assert.AreEqual(1000, u32.Count);
                for (int i = 0; i < u32.Count; i++)
                    Assert.AreEqual(U(u32[i]), r.NextU32(), "seed " + s["seed"] + " stream " + s["stream"] + " #" + i);
            }
        }

        [Test]
        public void IntMatchesVectorsAndRejectsInvertedRange()
        {
            var ints = O(V["ints"]);
            var r = new Pcg32(U(ints["seed"]), U(ints["stream"]));
            foreach (var co in A(ints["cases"]))
            {
                var c = O(co);
                long lo = L(c["min"]), hi = L(c["max"]);
                var values = A(c["values"]);
                for (int i = 0; i < values.Count; i++)
                    Assert.AreEqual(L(values[i]), r.Int(lo, hi), "Int(" + lo + ", " + hi + ") #" + i);
            }
            Assert.Throws<ArgumentOutOfRangeException>(() => r.Int(3, 2));
        }

        [Test]
        public void DeriveSeedMatchesVectors()
        {
            foreach (var co in A(V["deriveSeed"]))
            {
                var c = O(co);
                var parts = A(c["parts"]).ToArray();
                Assert.AreEqual(U(c["value"]), Pcg32.DeriveSeed(parts), string.Join("|", parts));
            }
            Assert.AreEqual(Pcg32.DeriveSeed("42", "vegetation", "z1", "7"), Pcg32.DeriveSeed(42, "vegetation", "z1", 7));
        }

        [Test]
        public void ForkConsumesExactlyOneParentValue()
        {
            var f = O(V["fork"]);
            var p = O(f["parent"]);
            var parent = new Pcg32(U(p["seed"]), U(p["stream"]));
            var child = parent.Fork((string)f["id"]);
            Assert.AreEqual(U(f["parentNextAfterFork"]), parent.NextU32());
            var want = A(f["child"]);
            for (int i = 0; i < want.Count; i++) Assert.AreEqual(U(want[i]), child.NextU32(), "child #" + i);
        }

        [Test]
        public void ShuffleMatchesVectors()
        {
            var sh = O(V["shuffle"]);
            var r = new Pcg32(U(sh["seed"]), U(sh["stream"]));
            foreach (var co in A(sh["cases"]))
            {
                var c = O(co);
                int n = (int)L(c["n"]);
                var a = new int[n];
                for (int i = 0; i < n; i++) a[i] = i;
                r.Shuffle(a);
                var want = A(c["result"]);
                for (int i = 0; i < n; i++) Assert.AreEqual((int)L(want[i]), a[i], "n=" + n + " #" + i);
            }
        }

        [Test]
        public void PickMatchesVectors()
        {
            var pk = O(V["pick"]);
            var r = new Pcg32(U(pk["seed"]), U(pk["stream"]));
            var items = A(pk["items"]).ConvertAll(x => (int)L(x));
            var want = A(pk["values"]);
            for (int i = 0; i < want.Count; i++) Assert.AreEqual((int)L(want[i]), r.Pick(items), "#" + i);
            Assert.Throws<ArgumentException>(() => r.Pick(new int[0]));
        }

        [Test]
        public void FloatIsInHalfOpenUnitRange()
        {
            var r = new Pcg32(9, 9);
            for (int i = 0; i < 1000; i++)
            {
                double f = r.Float();
                Assert.IsTrue(f >= 0 && f < 1, "Float ngoài [0,1): " + f);
            }
        }

        [Test]
        public void StateMatchesTsForSeed42Stream54()
        {
            Assert.AreEqual(109UL, new Pcg32(42, 54).Inc);
        }
    }
}
