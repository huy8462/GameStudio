// T-0027 (TST-RTM-03, TC-RTM-03; MOD-RTM-15; ADR-022; RR-CR02-04): C# khớp bảng 232 biểu thức của @gamestudio/expr.
// Bảng: engine/shared/expr/vectors/table.json, cùng tệp với test TS (table.test.ts): mã lỗi và vị trí phải trùng.
using System;
using System.Collections.Generic;
using GameStudio.Expr;
using NUnit.Framework;

namespace GameStudio.Tests
{
    public class ExprTests
    {
        sealed class Env : IExprEnv
        {
            readonly ExprValue[] vals;
            public int Calls;
            public Env(ExprValue[] vals) { this.vals = vals; }
            public ExprValue Ident(int slot) => vals[slot];
            // Hàm theo thứ tự khai báo trong vector: max, min, round, rand, event (khớp fixture.test-util.ts).
            public ExprValue Call(int fnSlot, double a0, double a1)
            {
                Calls++;
                switch (fnSlot)
                {
                    case 0: return ExprValue.Of(Math.Max(a0, a1));
                    case 1: return ExprValue.Of(Math.Min(a0, a1));
                    case 2: return ExprValue.Of(Math.Floor(a0 + 0.5)); // Math.round của JS: nửa làm tròn lên
                    case 3: return ExprValue.Of(0.25);
                    case 4: return ExprValue.Of(a0 == 7);
                    default: throw new InvalidOperationException("slot hàm lạ " + fnSlot);
                }
            }
        }

        static Dictionary<string, object> table;
        static Dictionary<string, object> T => table ??= MiniJson.Obj(MiniJson.Parse(VectorPath.Read("engine/shared/expr/vectors/table.json")));

        static List<object> A(object o) => (List<object>)o;
        static Dictionary<string, object> O(object o) => (Dictionary<string, object>)o;

        static ExprType TypeOf(string s) => s == "number" ? ExprType.Number : s == "bool" ? ExprType.Bool : ExprType.String;

        static ExprValue ValueOf(object o)
        {
            if (o is double d) return ExprValue.Of(d);
            if (o is bool b) return ExprValue.Of(b);
            return ExprValue.Of((string)o);
        }

        static ExprContextSpec Spec()
        {
            var spec = new ExprContextSpec();
            var s = O(T["spec"]);
            foreach (var io in A(s["idents"])) { var p = A(io); spec.Ident((string)p[0], TypeOf((string)p[1])); }
            foreach (var fo in A(s["fns"])) { var p = A(fo); spec.Fn((string)p[0], (int)(double)p[1], TypeOf((string)p[2])); }
            return spec;
        }

        static Env NewEnv(ExprContextSpec spec, Dictionary<string, ExprValue> overrides = null)
        {
            var values = O(T["values"]);
            var vals = new ExprValue[spec.IdentNames.Count];
            for (int i = 0; i < vals.Length; i++)
            {
                string n = spec.IdentNames[i];
                vals[i] = overrides != null && overrides.TryGetValue(n, out var v) ? v : ValueOf(values[n]);
            }
            return new Env(vals);
        }

        static CompiledExpr Ok(string src, ExprContextSpec spec)
        {
            if (!ExprCompiler.TryCompile(src, spec, out var c, out var err)) Assert.Fail(src + " -> " + err);
            return c;
        }

        [Test]
        public void ValidTableMatchesVectors()
        {
            var spec = Spec();
            var valid = A(T["valid"]);
            var errs = A(T["errors"]);
            Assert.GreaterOrEqual(valid.Count + errs.Count, 200);
            foreach (var vo in valid)
            {
                var v = O(vo);
                string src = (string)v["src"];
                var c = Ok(src, spec);
                Assert.AreEqual(TypeOf((string)v["type"]), c.Type, src);
                var got = c.Eval(NewEnv(spec));
                var want = ValueOf(v["value"]);
                Assert.IsTrue(ExprValue.Same(want, got), src + ": mong " + want + ", nhận " + got);
            }
        }

        [Test]
        public void ErrorTableMatchesCodeAndPosition()
        {
            var spec = Spec();
            foreach (var eo in A(T["errors"]))
            {
                var e = O(eo);
                string src = (string)e["src"];
                bool ok = ExprCompiler.TryCompile(src, spec, out var c, out var err);
                Assert.IsFalse(ok, "phải lỗi: " + src);
                Assert.IsNull(c);
                Assert.AreEqual((string)e["code"], err.Code, src + " -> " + err);
                Assert.AreEqual((int)(double)e["pos"], err.Pos, src + " -> " + err);
            }
        }

        [Test]
        public void SlotsFollowSpecOrder()
        {
            var spec = Spec();
            var c = Ok("hour >= 18 && flag.cua_mo", spec);
            Assert.AreEqual(spec.IdentNames.ToArray(), c.IdentSlots);
            Assert.AreEqual(spec.FnNames.ToArray(), c.FnSlots);
            Assert.AreEqual("hour >= 18 && flag.cua_mo", c.Src);
            Assert.IsTrue(c.Eval(NewEnv(spec)).Bool);
            var six = new Dictionary<string, ExprValue> { ["hour"] = ExprValue.Of(6) };
            Assert.IsFalse(c.Eval(NewEnv(spec, six)).Bool);
        }

        [Test]
        public void ShortCircuitSkipsRightSide()
        {
            var spec = Spec();
            var env = NewEnv(spec);
            Assert.IsFalse(Ok("flag.da_gap && event(7)", spec).Eval(env).Bool);
            Assert.IsTrue(Ok("flag.cua_mo || event(7)", spec).Eval(env).Bool);
            Assert.AreEqual(0, env.Calls);
            Assert.IsTrue(Ok("flag.cua_mo && event(7)", spec).Eval(env).Bool);
            Assert.AreEqual(1, env.Calls);
        }

        [Test]
        public void DepthLimitIs32AndSourceLimitIs512()
        {
            var spec = Spec();
            Assert.IsTrue(ExprCompiler.TryCompile(new string('(', 31) + "1" + new string(')', 31), spec, out _, out _));
            Assert.IsFalse(ExprCompiler.TryCompile(new string('(', 40) + "1" + new string(')', 40), spec, out _, out var e1));
            Assert.AreEqual(ExprCode.Syntax, e1.Code);
            Assert.IsFalse(ExprCompiler.TryCompile(new string('-', 40) + "1", spec, out _, out _));
            Assert.IsFalse(ExprCompiler.TryCompile(string.Concat(System.Linq.Enumerable.Repeat("1+", 256)) + "1", spec, out _, out var e2));
            Assert.AreEqual(512, e2.Pos);
        }

        [Test]
        public void FnDeclaredWithMoreThanTwoArgsIsRejected()
        {
            var spec = new ExprContextSpec().Fn("f", 3, ExprType.Number);
            Assert.IsFalse(ExprCompiler.TryCompile("f(1, 2, 3)", spec, out _, out var err));
            Assert.AreEqual(ExprCode.Arity, err.Code);
        }
    }
}
