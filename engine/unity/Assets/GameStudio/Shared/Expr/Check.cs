// T-0027 (PSC-RTM-04 bước check; ALG-RTM-04; ADR-022): kiểm tĩnh định danh/hàm (danh sách trắng → slot), số đối, kiểu.
// Bản C# của expr/src/check.ts; trả cây Node đã gán Slot và Type.
using System;
using System.Collections.Generic;

namespace GameStudio.Expr
{
    public static class Check
    {
        sealed class CheckFail : Exception
        {
            public readonly ExprError Error;
            public CheckFail(string code, int pos, string msg) { Error = new ExprError(code, pos, msg); }
        }

        static string Name(ExprType t) => t == ExprType.Number ? "number" : t == ExprType.Bool ? "bool" : "string";

        static string OpText(Op op)
        {
            switch (op)
            {
                case Op.Or: return "||";
                case Op.And: return "&&";
                case Op.Eq: return "==";
                case Op.Ne: return "!=";
                case Op.Lt: return "<";
                case Op.Le: return "<=";
                case Op.Gt: return ">";
                case Op.Ge: return ">=";
                case Op.Add: return "+";
                case Op.Sub: return "-";
                case Op.Mul: return "*";
                case Op.Div: return "/";
                case Op.Mod: return "%";
                case Op.Not: return "!";
                default: return "-";
            }
        }

        static void Need(Node n, ExprType got, ExprType want, string what)
        {
            if (got != want) throw new CheckFail(ExprCode.Type, n.Pos, what + " cần " + Name(want) + ", nhận " + Name(got));
        }

        static Node Visit(Node n, ExprContextSpec spec)
        {
            switch (n.Kind)
            {
                case NodeKind.Lit:
                    return new Node { Kind = NodeKind.Lit, Type = n.Value.Type, Value = n.Value, Pos = n.Pos };
                case NodeKind.Ident:
                {
                    if (!spec.IdentSlot.TryGetValue(n.Name, out int slot))
                        throw new CheckFail(ExprCode.UnknownIdent, n.Pos, "định danh lạ '" + n.Name + "'");
                    return new Node { Kind = NodeKind.Ident, Type = spec.IdentTypes[slot], Slot = slot, Pos = n.Pos };
                }
                case NodeKind.Unary:
                {
                    var arg = Visit(n.Left, spec);
                    Need(n, arg.Type, n.Op == Op.Not ? ExprType.Bool : ExprType.Number, "'" + OpText(n.Op) + "'");
                    return new Node { Kind = NodeKind.Unary, Type = arg.Type, Op = n.Op, Left = arg, Pos = n.Pos };
                }
                case NodeKind.Binary:
                    return VisitBinary(n, spec);
                default:
                    return VisitCall(n, spec);
            }
        }

        static Node VisitBinary(Node n, ExprContextSpec spec)
        {
            var left = Visit(n.Left, spec);
            var right = Visit(n.Right, spec);
            string op = "'" + OpText(n.Op) + "'";
            ExprType type;
            if (n.Op == Op.And || n.Op == Op.Or)
            {
                Need(n, left.Type, ExprType.Bool, op);
                Need(n, right.Type, ExprType.Bool, op);
                type = ExprType.Bool;
            }
            else if (n.Op == Op.Eq || n.Op == Op.Ne)
            {
                if (left.Type != right.Type)
                    throw new CheckFail(ExprCode.Type, n.Pos, op + " cần hai vế cùng kiểu (" + Name(left.Type) + ", " + Name(right.Type) + ")");
                type = ExprType.Bool;
            }
            else
            {
                Need(n, left.Type, ExprType.Number, op);
                Need(n, right.Type, ExprType.Number, op);
                type = n.Op == Op.Lt || n.Op == Op.Le || n.Op == Op.Gt || n.Op == Op.Ge ? ExprType.Bool : ExprType.Number;
            }
            return new Node { Kind = NodeKind.Binary, Type = type, Op = n.Op, Left = left, Right = right, Pos = n.Pos };
        }

        static Node VisitCall(Node n, ExprContextSpec spec)
        {
            if (!spec.FnSlot.TryGetValue(n.Name, out int slot))
                throw new CheckFail(ExprCode.UnknownFn, n.Pos, "hàm không được phép '" + n.Name + "'");
            int want = spec.FnArgs[slot];
            if (want > ExprLimits.MaxFnArgs)
                throw new CheckFail(ExprCode.Arity, n.Pos, "hàm '" + n.Name + "' khai báo quá " + ExprLimits.MaxFnArgs + " đối");
            if (n.Args.Count != want)
                throw new CheckFail(ExprCode.Arity, n.Pos, "hàm '" + n.Name + "' cần " + want + " đối, nhận " + n.Args.Count);
            var args = new List<Node>(n.Args.Count);
            foreach (var a in n.Args)
            {
                var ta = Visit(a, spec);
                Need(a, ta.Type, ExprType.Number, "đối của '" + n.Name + "'");
                args.Add(ta);
            }
            return new Node { Kind = NodeKind.Call, Type = spec.FnRet[slot], Slot = slot, Args = args, Pos = n.Pos };
        }

        public static bool TryCheck(Node ast, ExprContextSpec spec, out Node typed, out ExprError err)
        {
            typed = null; err = null;
            try
            {
                typed = Visit(ast, spec);
                return true;
            }
            catch (CheckFail e)
            {
                err = e.Error;
                return false;
            }
        }
    }
}
