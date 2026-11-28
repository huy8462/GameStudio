// T-0027 (MOD-GEN-11, MOD-RTM-15; ALG-RTM-04; ADR-022; DTO-GEN-01): kiểu công khai và AST của bản C# @gamestudio/expr.
// Tương ứng engine/shared/expr/src/{types,ast}.ts; mã lỗi và vị trí giống TS để so vector chung (TST-RTM-03).
using System;
using System.Collections.Generic;
using System.Globalization;

namespace GameStudio.Expr
{
    public enum ExprType { Number, Bool, String }

    /// <summary>Giá trị biểu thức, struct để eval không cấp phát (FR-RTM-23).</summary>
    public readonly struct ExprValue
    {
        public readonly ExprType Type;
        public readonly double Num;
        public readonly bool Bool;
        public readonly string Str;
        ExprValue(ExprType t, double n, bool b, string s) { Type = t; Num = n; Bool = b; Str = s; }
        public static ExprValue Of(double n) => new ExprValue(ExprType.Number, n, false, null);
        public static ExprValue Of(bool b) => new ExprValue(ExprType.Bool, 0, b, null);
        public static ExprValue Of(string s) => new ExprValue(ExprType.String, 0, false, s);

        /// <summary>Bằng nhau chặt như === của TS: khác kiểu thì không bằng.</summary>
        public static bool Same(in ExprValue a, in ExprValue b)
        {
            if (a.Type != b.Type) return false;
            switch (a.Type)
            {
                case ExprType.Number: return a.Num == b.Num;
                case ExprType.Bool: return a.Bool == b.Bool;
                default: return string.Equals(a.Str, b.Str, StringComparison.Ordinal);
            }
        }

        public override string ToString() =>
            Type == ExprType.Number ? Num.ToString(CultureInfo.InvariantCulture) : Type == ExprType.Bool ? (Bool ? "true" : "false") : Str;
    }

    public static class ExprLimits
    {
        public const int MaxSourceLength = 512;
        public const int MaxDepth = 32;
        public const int MaxFnArgs = 2;
    }

    /// <summary>Mã lỗi giống TS (ExprErrorCode).</summary>
    public static class ExprCode
    {
        public const string Syntax = "syntax";
        public const string UnknownIdent = "unknown_ident";
        public const string UnknownFn = "unknown_fn";
        public const string Type = "type";
        public const string Arity = "arity";
    }

    public sealed class ExprError
    {
        public readonly string Code;
        /// <summary>Vị trí ký tự (0-based) trong nguồn.</summary>
        public readonly int Pos;
        public readonly string Message;
        public ExprError(string code, int pos, string message) { Code = code; Pos = pos; Message = message; }
        public override string ToString() => Code + "@" + Pos + ": " + Message;
    }

    /// <summary>Ngữ cảnh do nơi dùng cấp: định danh và hàm trong danh sách trắng; slot = thứ tự khai báo.</summary>
    public sealed class ExprContextSpec
    {
        public readonly List<string> IdentNames = new List<string>();
        public readonly List<ExprType> IdentTypes = new List<ExprType>();
        public readonly List<string> FnNames = new List<string>();
        public readonly List<int> FnArgs = new List<int>();
        public readonly List<ExprType> FnRet = new List<ExprType>();
        public readonly Dictionary<string, int> IdentSlot = new Dictionary<string, int>();
        public readonly Dictionary<string, int> FnSlot = new Dictionary<string, int>();

        public ExprContextSpec Ident(string name, ExprType type)
        {
            IdentSlot[name] = IdentNames.Count; IdentNames.Add(name); IdentTypes.Add(type); return this;
        }

        public ExprContextSpec Fn(string name, int args, ExprType ret)
        {
            FnSlot[name] = FnNames.Count; FnNames.Add(name); FnArgs.Add(args); FnRet.Add(ret); return this;
        }
    }

    /// <summary>Môi trường đánh giá; không cấp phát trong vòng nóng.</summary>
    public interface IExprEnv
    {
        ExprValue Ident(int slot);
        /// <summary>Trả số hoặc bool theo khai báo hàm.</summary>
        ExprValue Call(int fnSlot, double a0, double a1);
    }

    public sealed class CompiledExpr
    {
        public readonly string Src;
        public readonly ExprType Type;
        public readonly string[] IdentSlots;
        public readonly string[] FnSlots;
        readonly Func<IExprEnv, ExprValue> run;

        public CompiledExpr(string src, ExprType type, string[] identSlots, string[] fnSlots, Func<IExprEnv, ExprValue> run)
        {
            Src = src; Type = type; IdentSlots = identSlots; FnSlots = fnSlots; this.run = run;
        }

        public ExprValue Eval(IExprEnv env) => run(env);
    }

    public enum Op { Or, And, Eq, Ne, Lt, Le, Gt, Ge, Add, Sub, Mul, Div, Mod, Not, Neg }

    public enum NodeKind { Lit, Ident, Unary, Binary, Call }

    /// <summary>Nút AST (sau parse: Name là tên định danh/hàm; sau check: Slot và Type đã gán).</summary>
    public sealed class Node
    {
        public NodeKind Kind;
        public int Pos;
        public ExprValue Value;
        public string Name;
        public Op Op;
        public Node Left, Right;
        public List<Node> Args;
        public int Slot;
        public ExprType Type;
    }
}
