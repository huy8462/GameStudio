// T-0022 (MOD-RTM-05; DTO-RTM-01, DTO-RTM-04): đọc JSON thành Dictionary/List/double/string/bool/null.
// JsonUtility không đọc được bảng theo khoá (parts[tier]); chỉ dùng lúc nạp, không dùng trong vòng lặp nóng.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GameStudio
{
    public static class MiniJson
    {
        public const int MaxDepth = 64;

        public static object Parse(string json)
        {
            if (json == null) throw new FormatException("JSON rỗng");
            int i = 0;
            var v = Value(json, ref i, 0);
            Ws(json, ref i);
            if (i != json.Length) throw Err(json, i, "thừa ký tự");
            return v;
        }

        public static Dictionary<string, object> Obj(object v) => v as Dictionary<string, object>;
        public static List<object> Arr(object v) => v as List<object>;
        public static string Str(Dictionary<string, object> o, string key) => o != null && o.TryGetValue(key, out var v) ? v as string : null;
        public static double Num(Dictionary<string, object> o, string key, double fallback = 0) =>
            o != null && o.TryGetValue(key, out var v) && v is double d ? d : fallback;
        public static bool Has(Dictionary<string, object> o, string key) => o != null && o.ContainsKey(key) && o[key] != null;

        static FormatException Err(string s, int i, string msg) => new FormatException($"JSON lỗi ở vị trí {i}: {msg}");

        static void Ws(string s, ref int i)
        {
            while (i < s.Length && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == '\t')) i++;
        }

        static object Value(string s, ref int i, int depth)
        {
            if (depth > MaxDepth) throw Err(s, i, "lồng quá sâu");
            Ws(s, ref i);
            if (i >= s.Length) throw Err(s, i, "hết chuỗi");
            char c = s[i];
            if (c == '{') return Object(s, ref i, depth);
            if (c == '[') return Array(s, ref i, depth);
            if (c == '"') return String(s, ref i);
            if (Lit(s, ref i, "true")) return true;
            if (Lit(s, ref i, "false")) return false;
            if (Lit(s, ref i, "null")) return null;
            return Number(s, ref i);
        }

        static bool Lit(string s, ref int i, string word)
        {
            if (string.CompareOrdinal(s, i, word, 0, word.Length) != 0) return false;
            i += word.Length;
            return true;
        }

        static Dictionary<string, object> Object(string s, ref int i, int depth)
        {
            var o = new Dictionary<string, object>();
            i++;
            Ws(s, ref i);
            if (i < s.Length && s[i] == '}') { i++; return o; }
            while (true)
            {
                Ws(s, ref i);
                if (i >= s.Length || s[i] != '"') throw Err(s, i, "cần tên trường");
                string k = String(s, ref i);
                Ws(s, ref i);
                if (i >= s.Length || s[i] != ':') throw Err(s, i, "cần ':'");
                i++;
                o[k] = Value(s, ref i, depth + 1);
                Ws(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                if (i < s.Length && s[i] == '}') { i++; return o; }
                throw Err(s, i, "cần ',' hoặc '}'");
            }
        }

        static List<object> Array(string s, ref int i, int depth)
        {
            var a = new List<object>();
            i++;
            Ws(s, ref i);
            if (i < s.Length && s[i] == ']') { i++; return a; }
            while (true)
            {
                a.Add(Value(s, ref i, depth + 1));
                Ws(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                if (i < s.Length && s[i] == ']') { i++; return a; }
                throw Err(s, i, "cần ',' hoặc ']'");
            }
        }

        static string String(string s, ref int i)
        {
            var b = new StringBuilder();
            i++;
            while (true)
            {
                if (i >= s.Length) throw Err(s, i, "chuỗi chưa đóng");
                char c = s[i++];
                if (c == '"') return b.ToString();
                if (c != '\\') { b.Append(c); continue; }
                if (i >= s.Length) throw Err(s, i, "thoát dở");
                char e = s[i++];
                switch (e)
                {
                    case '"': b.Append('"'); break;
                    case '\\': b.Append('\\'); break;
                    case '/': b.Append('/'); break;
                    case 'b': b.Append('\b'); break;
                    case 'f': b.Append('\f'); break;
                    case 'n': b.Append('\n'); break;
                    case 'r': b.Append('\r'); break;
                    case 't': b.Append('\t'); break;
                    case 'u':
                        if (i + 4 > s.Length || !ushort.TryParse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var code))
                            throw Err(s, i, "\\u sai");
                        b.Append((char)code);
                        i += 4;
                        break;
                    default: throw Err(s, i, "thoát lạ");
                }
            }
        }

        static object Number(string s, ref int i)
        {
            int start = i;
            while (i < s.Length && (char.IsDigit(s[i]) || s[i] == '-' || s[i] == '+' || s[i] == '.' || s[i] == 'e' || s[i] == 'E')) i++;
            if (i == start || !double.TryParse(s.Substring(start, i - start), NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
                throw Err(s, start, "giá trị lạ");
            return d;
        }
    }
}
