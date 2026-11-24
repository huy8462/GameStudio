# @gamestudio/expr

Biểu thức an toàn cho điều kiện và công thức trong dữ liệu game (MOD-GEN-11, MOD-RTM-15; ADR-022, ALG-RTM-04). Gói lá, không phụ thuộc gói nào, không `node:*`: dùng được cả runtime, CLI, `web/api`.

## API (phiếu T-0003)

| API | Việc |
|---|---|
| `compile(src, spec)` | `Result<CompiledExpr, ExprError>`: lex → Pratt parse → kiểm tĩnh → gập hằng → closure |
| `CompiledExpr` | `{src, type, identSlots, fnSlots, eval(env)}`; `eval` không cấp phát, ngắn mạch `&&` `\|\|` |
| `ExprContextSpec` | `{idents: {tên: 'number'\|'bool'\|'string'}, fns: {tên: {args ≤ 2, ret}}}`; slot = vị trí khoá |
| `ExprEnv` | `ident(slot)`, `call(fnSlot, a0, a1)` do nơi dùng cấp |
| `parse`, `lex` | Dùng cho công cụ (báo lỗi trình soạn) |
| `ExprError` | `{code: syntax\|unknown_ident\|unknown_fn\|type\|arity, pos, message}` |

## Ngữ pháp (PSC-RTM-04)

- Số `\d+(\.\d+)?`, chuỗi `'…'` (escape `\'` `\\`), `true`/`false`, định danh `[a-z_][a-z0-9_]*(\.[a-z0-9_]+)*` (vd `quest.trau.state`).
- Ưu tiên: `||` 1, `&&` 2, `==` `!=` 3, `<` `<=` `>` `>=` 4, `+` `-` 5, `*` `/` `%` 6, tiền tố `!` `-` 7, gọi hàm/ngoặc 8.
- Kiểu: `&&` `||` `!` cần bool; số học và so sánh cần number; `==` `!=` hai vế cùng kiểu; đối số hàm là number.
- Giới hạn: nguồn ≤ 512 ký tự, lồng ≤ 32. Không `eval`/`Function`, không truy cập thuộc tính lúc chạy.

## Ví dụ

```ts
const spec = { idents: { hour: 'number', 'flag.cua_mo': 'bool' }, fns: {} } as const;
const r = compile('hour >= 18 && flag.cua_mo', spec);
if (r.ok && r.value.type === 'bool') r.value.eval({ ident: (s) => vals[s], call: () => 0 });
```

## Test

`lexer.test.ts`, `compile.test.ts`, `table.test.ts` (bảng 232 biểu thức, TST-RTM-03), kiểm không có `eval`/`Function` trong `src/`.

## Lệch DDD-04

`CompiledExpr` thêm `type`, `identSlots`, `fnSlots`; chi tiết trong `docs/tickets/T-0003.md`.
