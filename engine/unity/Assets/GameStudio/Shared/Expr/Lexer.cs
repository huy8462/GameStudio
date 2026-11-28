// T-0027 (PSC-RTM-04 bước lex; ALG-RTM-04; ADR-022): lexer biểu thức an toàn, bản C# của expr/src/lexer.ts.
// Lỗi syntax cùng vị trí và thông điệp với TS.
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GameStudio.Expr
{
    public enum TokenKind { Num, Str, Bool, Ident, Op, LParen, RParen, Comma, Eof }

    public readonly struct Token
    {
        public readonly TokenKind Kind;
        /// <summary>Văn bản gốc (op, ident) hoặc giá trị đã giải escape (str).</summary>
        public readonly string Text;
        public readonly double Num;
        public readonly int Pos;
        public Token(TokenKind kind, string text, double num, int pos) { Kind = kind; Text = text; Num = num; Pos = pos; }
    }

    public static class Lexer
    {
        static readonly string[] Ops2 = { "&&", "||", "==", "!=", "<=", ">=" };
        const string Ops1 = "!<>+-*/%";

        static bool IsDigit(char c) => c >= '0' && c <= '9';
        static bool IsIdentStart(char c) => (c >= 'a' && c <= 'z') || c == '_';
        static bool IsIdentPart(char c) => IsIdentStart(c) || IsDigit(c);
        static bool IsSpace(char c) => c == ' ' || c == '\t' || c == '\n' || c == '\r';
        static char At(string s, int i) => i >= 0 && i < s.Length ? s[i] : '\0';

        static bool Fail(int pos, string msg, out ExprError err)
        {
            err = new ExprError(ExprCode.Syntax, pos, msg);
            return false;
        }

        public static bool TryLex(string src, out List<Token> tokens, out ExprError err)
        {
            tokens = null; err = null;
            if (src.Length > ExprLimits.MaxSourceLength)
                return Fail(ExprLimits.MaxSourceLength, "nguồn dài quá " + ExprLimits.MaxSourceLength + " ký tự", out err);
            var outp = new List<Token>();
            int i = 0;
            while (i < src.Length)
            {
                char c = src[i];
                if (IsSpace(c)) { i++; continue; }
                int start = i;
                if (IsDigit(c))
                {
                    while (IsDigit(At(src, i))) i++;
                    if (At(src, i) == '.' && IsDigit(At(src, i + 1)))
                    {
                        i++;
                        while (IsDigit(At(src, i))) i++;
                    }
                    if (IsIdentStart(At(src, i))) return Fail(i, "số dính liền chữ", out err);
                    string text = src.Substring(start, i - start);
                    outp.Add(new Token(TokenKind.Num, text, double.Parse(text, CultureInfo.InvariantCulture), start));
                    continue;
                }
                if (c == '\'')
                {
                    var sb = new StringBuilder();
                    i++;
                    while (true)
                    {
                        if (i >= src.Length) return Fail(start, "chuỗi chưa đóng", out err);
                        char d = src[i];
                        if (d == '\'') break;
                        if (d == '\\')
                        {
                            char e = At(src, i + 1);
                            if (e != '\'' && e != '\\') return Fail(i, "escape không hợp lệ (chỉ \\' và \\\\)", out err);
                            sb.Append(e);
                            i += 2;
                            continue;
                        }
                        sb.Append(d);
                        i++;
                    }
                    i++;
                    outp.Add(new Token(TokenKind.Str, sb.ToString(), 0, start));
                    continue;
                }
                if (IsIdentStart(c))
                {
                    while (IsIdentPart(At(src, i))) i++;
                    while (At(src, i) == '.')
                    {
                        if (!IsIdentPart(At(src, i + 1))) return Fail(i, "định danh có dấu chấm thừa", out err);
                        i++;
                        while (IsIdentPart(At(src, i))) i++;
                    }
                    string text = src.Substring(start, i - start);
                    outp.Add(new Token(text == "true" || text == "false" ? TokenKind.Bool : TokenKind.Ident, text, 0, start));
                    continue;
                }
                if (i + 1 < src.Length)
                {
                    string two = src.Substring(i, 2);
                    bool hit = false;
                    for (int k = 0; k < Ops2.Length; k++) if (Ops2[k] == two) { hit = true; break; }
                    if (hit) { outp.Add(new Token(TokenKind.Op, two, 0, start)); i += 2; continue; }
                }
                if (Ops1.IndexOf(c) >= 0)
                {
                    outp.Add(new Token(TokenKind.Op, c.ToString(), 0, start));
                    i++;
                    continue;
                }
                if (c == '(' || c == ')' || c == ',')
                {
                    outp.Add(new Token(c == '(' ? TokenKind.LParen : c == ')' ? TokenKind.RParen : TokenKind.Comma, c.ToString(), 0, start));
                    i++;
                    continue;
                }
                return Fail(i, "ký tự không hợp lệ '" + c + "'", out err);
            }
            outp.Add(new Token(TokenKind.Eof, "", 0, src.Length));
            tokens = outp;
            return true;
        }
    }
}
