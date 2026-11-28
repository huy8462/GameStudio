// T-0027 (PSC-RTM-04 bước compile; ALG-RTM-04; ADR-022; MOD-RTM-15): gập hằng và biên dịch closure ngắn mạch.
// Không reflection/eval; Eval không cấp phát (ExprValue là struct). Bản C# của expr/src/compile.ts.
using System;
using System.Collections.Generic;

namespace GameStudio.Expr
{
    public static class ExprCompiler
    {
        delegate ExprValue Fn(IExprEnv env);

        static ExprValue Apply(Op op, in ExprValue a, in ExprValue b)
        {
            switch (op)
            {
                case Op.Or: return ExprValue.Of(a.Bool || b.Bool);
                case Op.And: return ExprValue.Of(a.Bool && b.Bool);
                case Op.Eq: return ExprValue.Of(ExprValue.Same(a, b));
                case Op.Ne: return ExprValue.Of(!ExprValue.Same(a, b));
                case Op.Lt: return ExprValue.Of(a.Num < b.Num);
                case Op.Le: return ExprValue.Of(a.Num <= b.Num);
                case Op.Gt: return ExprValue.Of(a.Num > b.Num);
                case Op.Ge: return ExprValue.Of(a.Num >= b.Num);
                case Op.Add: return ExprValue.Of(a.Num + b.Num);
                case Op.Sub: return ExprValue.Of(a.Num - b.Num);
                case Op.Mul: return ExprValue.Of(a.Num * b.Num);
                case Op.Div: return ExprValue.Of(a.Num / b.Num);
                default: return ExprValue.Of(a.Num % b.Num);
            }
        }

        /// <summary>Gập hằng: nút có mọi con là hằng thành hằng. Gọi hàm không gập (môi trường quyết định).</summary>
        public static Node Fold(Node n)
        {
            switch (n.Kind)
            {
                case NodeKind.Unary:
                {
                    var arg = Fold(n.Left);
                    if (arg.Kind == NodeKind.Lit)
                    {
                        var v = n.Op == Op.Not ? ExprValue.Of(!arg.Value.Bool) : ExprValue.Of(-arg.Value.Num);
                        return new Node { Kind = NodeKind.Lit, Type = n.Type, Value = v, Pos = n.Pos };
                    }
                    return new Node { Kind = NodeKind.Unary, Type = n.Type, Op = n.Op, Left = arg, Pos = n.Pos };
                }
                case NodeKind.Binary:
                {
                    var l = Fold(n.Left);
                    var r = Fold(n.Right);
                    if (l.Kind == NodeKind.Lit && r.Kind == NodeKind.Lit)
                        return new Node { Kind = NodeKind.Lit, Type = n.Type, Value = Apply(n.Op, l.Value, r.Value), Pos = n.Pos };
                    return new Node { Kind = NodeKind.Binary, Type = n.Type, Op = n.Op, Left = l, Right = r, Pos = n.Pos };
                }
                case NodeKind.Call:
                {
                    var args = new List<Node>(n.Args.Count);
                    foreach (var a in n.Args) args.Add(Fold(a));
                    return new Node { Kind = NodeKind.Call, Type = n.Type, Slot = n.Slot, Args = args, Pos = n.Pos };
                }
                default:
                    return n;
            }
        }

        static Fn Emit(Node n)
        {
            switch (n.Kind)
            {
                case NodeKind.Lit:
                {
                    var v = n.Value;
                    return env => v;
                }
                case NodeKind.Ident:
                {
                    int s = n.Slot;
                    return env => env.Ident(s);
                }
                case NodeKind.Unary:
                {
                    var a = Emit(n.Left);
                    if (n.Op == Op.Not) return env => ExprValue.Of(!a(env).Bool);
                    return env => ExprValue.Of(-a(env).Num);
                }
                case NodeKind.Call:
                {
                    int s = n.Slot;
                    Fn a0 = n.Args.Count > 0 ? Emit(n.Args[0]) : null;
                    Fn a1 = n.Args.Count > 1 ? Emit(n.Args[1]) : null;
                    if (a0 != null && a1 != null) return env => env.Call(s, a0(env).Num, a1(env).Num);
                    if (a0 != null) return env => env.Call(s, a0(env).Num, 0);
                    return env => env.Call(s, 0, 0);
                }
                default:
                    return EmitBinary(n.Op, Emit(n.Left), Emit(n.Right));
            }
        }

        static Fn EmitBinary(Op op, Fn l, Fn r)
        {
            switch (op)
            {
                case Op.Or: return env => ExprValue.Of(l(env).Bool || r(env).Bool);
                case Op.And: return env => ExprValue.Of(l(env).Bool && r(env).Bool);
                case Op.Eq: return env => ExprValue.Of(ExprValue.Same(l(env), r(env)));
                case Op.Ne: return env => ExprValue.Of(!ExprValue.Same(l(env), r(env)));
                case Op.Lt: return env => ExprValue.Of(l(env).Num < r(env).Num);
                case Op.Le: return env => ExprValue.Of(l(env).Num <= r(env).Num);
                case Op.Gt: return env => ExprValue.Of(l(env).Num > r(env).Num);
                case Op.Ge: return env => ExprValue.Of(l(env).Num >= r(env).Num);
                case Op.Add: return env => ExprValue.Of(l(env).Num + r(env).Num);
                case Op.Sub: return env => ExprValue.Of(l(env).Num - r(env).Num);
                case Op.Mul: return env => ExprValue.Of(l(env).Num * r(env).Num);
                case Op.Div: return env => ExprValue.Of(l(env).Num / r(env).Num);
                default: return env => ExprValue.Of(l(env).Num % r(env).Num);
            }
        }

        /// <summary>compile(src, spec) (DDD-04 §3.2): biên dịch một lần khi nạp; Eval không cấp phát.</summary>
        public static bool TryCompile(string src, ExprContextSpec spec, out CompiledExpr compiled, out ExprError err)
        {
            compiled = null;
            if (src == null) { err = new ExprError(ExprCode.Syntax, 0, "nguồn rỗng"); return false; }
            if (!Parser.TryParse(src, out var ast, out err)) return false;
            if (!Check.TryCheck(ast, spec, out var typed, out err)) return false;
            var root = Fold(typed);
            var run = Emit(root);
            compiled = new CompiledExpr(src, root.Type, spec.IdentNames.ToArray(), spec.FnNames.ToArray(), env => run(env));
            return true;
        }
    }
}
