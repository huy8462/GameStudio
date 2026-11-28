// T-0027 (PSC-RTM-04 bước parse; ALG-RTM-04; ADR-022): Pratt parser, bản C# của expr/src/parser.ts.
// || 1, && 2, == != 3, < <= > >= 4, + - 5, * / % 6, tiền tố ! - 7, gọi hàm/ngoặc 8. Lồng tối đa 32.
using System;
using System.Collections.Generic;

namespace GameStudio.Expr
{
    public static class Parser
    {
        const int PrefixPrec = 7;

        sealed class ParseFail : Exception
        {
            public readonly ExprError Error;
            public ParseFail(int pos, string msg) { Error = new ExprError(ExprCode.Syntax, pos, msg); }
        }

        static int Prec(string op)
        {
            switch (op)
            {
                case "||": return 1;
                case "&&": return 2;
                case "==": case "!=": return 3;
                case "<": case "<=": case ">": case ">=": return 4;
                case "+": case "-": return 5;
                case "*": case "/": case "%": return 6;
                default: return -1;
            }
        }

        static Op BinOp(string op)
        {
            switch (op)
            {
                case "||": return Op.Or;
                case "&&": return Op.And;
                case "==": return Op.Eq;
                case "!=": return Op.Ne;
                case "<": return Op.Lt;
                case "<=": return Op.Le;
                case ">": return Op.Gt;
                case ">=": return Op.Ge;
                case "+": return Op.Add;
                case "-": return Op.Sub;
                case "*": return Op.Mul;
                case "/": return Op.Div;
                default: return Op.Mod;
            }
        }

        sealed class State
        {
            readonly List<Token> toks;
            int i;
            int depth;
            public State(List<Token> toks) { this.toks = toks; }

            Token Peek() => toks[Math.Min(i, toks.Count - 1)];
            Token Next() { var t = Peek(); if (i < toks.Count - 1) i++; return t; }

            public Node ParseAll()
            {
                var n = Expr(0);
                var t = Peek();
                if (t.Kind != TokenKind.Eof) throw new ParseFail(t.Pos, "thừa '" + t.Text + "'");
                return n;
            }

            Node Expr(int minPrec)
            {
                if (++depth > ExprLimits.MaxDepth) throw new ParseFail(Peek().Pos, "lồng sâu quá " + ExprLimits.MaxDepth);
                var left = Prefix();
                while (true)
                {
                    var t = Peek();
                    int prec = t.Kind == TokenKind.Op ? Prec(t.Text) : -1;
                    if (prec < 0 || prec <= minPrec) break;
                    Next();
                    var right = Expr(prec);
                    left = new Node { Kind = NodeKind.Binary, Op = BinOp(t.Text), Left = left, Right = right, Pos = t.Pos };
                }
                depth--;
                return left;
            }

            Node Prefix()
            {
                var t = Next();
                switch (t.Kind)
                {
                    case TokenKind.Num: return new Node { Kind = NodeKind.Lit, Value = ExprValue.Of(t.Num), Pos = t.Pos };
                    case TokenKind.Str: return new Node { Kind = NodeKind.Lit, Value = ExprValue.Of(t.Text), Pos = t.Pos };
                    case TokenKind.Bool: return new Node { Kind = NodeKind.Lit, Value = ExprValue.Of(t.Text == "true"), Pos = t.Pos };
                    case TokenKind.Ident:
                        if (Peek().Kind == TokenKind.LParen) return Call(t);
                        return new Node { Kind = NodeKind.Ident, Name = t.Text, Pos = t.Pos };
                    case TokenKind.LParen:
                    {
                        var inner = Expr(0);
                        var r = Next();
                        if (r.Kind != TokenKind.RParen) throw new ParseFail(r.Pos, "thiếu ')'");
                        return inner;
                    }
                    case TokenKind.Op:
                        if (t.Text == "!" || t.Text == "-")
                            return new Node { Kind = NodeKind.Unary, Op = t.Text == "!" ? Op.Not : Op.Neg, Left = Expr(PrefixPrec - 1), Pos = t.Pos };
                        throw new ParseFail(t.Pos, "toán tử '" + t.Text + "' đứng sai chỗ");
                    case TokenKind.Eof:
                        throw new ParseFail(t.Pos, "biểu thức kết thúc đột ngột");
                    default:
                        throw new ParseFail(t.Pos, "'" + t.Text + "' đứng sai chỗ");
                }
            }

            Node Call(Token name)
            {
                Next(); // '('
                var args = new List<Node>();
                if (Peek().Kind != TokenKind.RParen)
                {
                    while (true)
                    {
                        args.Add(Expr(0));
                        if (Peek().Kind == TokenKind.Comma) { Next(); continue; }
                        break;
                    }
                }
                var r = Next();
                if (r.Kind != TokenKind.RParen) throw new ParseFail(r.Pos, "thiếu ')' sau đối số");
                return new Node { Kind = NodeKind.Call, Name = name.Text, Args = args, Pos = name.Pos };
            }
        }

        public static bool TryParse(string src, out Node ast, out ExprError err)
        {
            ast = null;
            if (!Lexer.TryLex(src, out var toks, out err)) return false;
            try
            {
                ast = new State(toks).ParseAll();
                return true;
            }
            catch (ParseFail e)
            {
                err = e.Error;
                return false;
            }
        }
    }
}
