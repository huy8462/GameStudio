#!/usr/bin/env python3
"""Kiểm truy vết UIUX và sinh Phụ lục A.
Cách chạy (từ thư mục gốc repo): python docs/UIUX/tools/uiux-trace.py
Mặc định: UIUX = docs/UIUX, SRS = docs/SRS, DDD = docs/DDD. Ghi đè: uiux-trace.py <UIUX> <SRS> [<DDD>]
Kiểm:
  1. Mọi FR/NFR/UC/SCR/ERR/MSG của SRS-08 và mọi màn hình kênh Web ở SRS-00 mục 7 có trong mục "Truy vết" của UIUX.
  2. Mã SRS (FR, NFR, QT, UC, SCR, API, ERR, MSG, OI) và DDD (MOD, DTO, TBL, EP, SEQ, STM, PSC, CFG, TC, OID) nhắc trong UIUX đều có định nghĩa.
  3. Mã UIUX (WF, UF, CMP, TOK, UXR, TXT, UT, OIU, SCR-ADM, FRP-ADM) định nghĩa đúng một lần, mọi tham chiếu có định nghĩa.
  4. Dòng định nghĩa SCR-ADM/FRP-ADM có nhãn "đề xuất" hoặc "đã duyệt".
Ghi lại UIUX-00-PL-A-MA-TRAN-TRUY-VET.md. Mã thoát 0 khi sạch, 1 khi có vấn đề."""
import re, glob, os, sys, collections
here = os.path.dirname(os.path.abspath(__file__))
U = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(here)
docs_root = os.path.dirname(os.path.abspath(U))
S = sys.argv[2] if len(sys.argv) > 2 else os.path.join(docs_root, 'SRS')
D = sys.argv[3] if len(sys.argv) > 3 else os.path.join(docs_root, 'DDD')
OUT = os.path.join(U, 'UIUX-00-PL-A-MA-TRAN-TRUY-VET.md')

UIUX_RE = r'(?:(?:WF|UF|CMP|TOK|UXR|TXT|UT|OIU)-[A-Z]+-\d+|SCR-ADM-\d+|FRP-ADM-\d+)'
SRS_RE = r'(?:FR|NFR|QT|UC|SCR|API|ERR|MSG|OI|AC)-[A-Z0-9]+-\d+'
DDD_RE = r'(?:MOD|DTO|TBL|EP|SEQ|STM|PSC|CFG|TC|OID)-[A-Z]+-\d+'

def read(f): return open(f, encoding='utf-8').read()
def cells(line): return [c.strip() for c in line.replace('\\|', '/').split('|')][1:-1]
def nkey(c):
    p, n = c.rsplit('-', 1); return (p, int(n))
def expand(text, pat):
    """Tìm mã, mở rộng dải 'X-nn…mm' hoặc 'X-nn...mm'."""
    out = []
    for m in re.finditer(r'(' + pat + r')(?:\s*(?:…|\.\.\.)\s*(\d+))?', text):
        c = m.group(1); out.append(c)
        if m.group(2):
            p, a = c.rsplit('-', 1)
            for k in range(int(a) + 1, int(m.group(2)) + 1): out.append('%s-%0*d' % (p, len(a), k))
    return out

uiux = {os.path.basename(f): read(f) for f in sorted(glob.glob(os.path.join(U, 'UIUX-0*.md')))
        if 'PL-A' not in f}
srs = {os.path.basename(f): read(f) for f in sorted(glob.glob(os.path.join(S, 'SRS-*.md'))) if 'PL-A' not in f}
ddd = {os.path.basename(f): read(f) for f in sorted(glob.glob(os.path.join(D, 'DDD-*.md'))) if 'PL-A' not in f}
problems = []

# --- Định nghĩa SRS / DDD
def first_cell_defs(texts, pat):
    d = collections.defaultdict(list)
    for n, t in texts.items():
        for line in t.splitlines():
            m = re.match(r'\|\s*(' + pat + r')\s*\|', line)
            if m: d[m.group(1)].append(n)
            m = re.match(r'#{3,4}\s+(' + pat + r')\b', line)
            if m: d[m.group(1)].append(n)
    return d
srs_def = first_cell_defs(srs, SRS_RE)
srs_all_text = '\n'.join(srs.values())
ddd_def = first_cell_defs(ddd, DDD_RE)

# --- Tập bắt buộc phủ
s08 = next((t for n, t in srs.items() if n.startswith('SRS-08')), '')
required = set()
for line in s08.splitlines():
    m = re.match(r'\|\s*((?:FR|NFR|UC|SCR|ERR|MSG)-WEB-\d+)\s*\|', line)
    if m: required.add(m.group(1))
s00 = next((t for n, t in srs.items() if n.startswith('SRS-00-TONG')), '')
sec = re.search(r'## 7\. Danh mục màn hình(.*?)\n## ', s00, re.S)
if sec:
    for line in sec.group(1).splitlines():
        c = cells(line)
        if len(c) >= 3 and c[2].startswith('Web') and 'dev' not in c[2]:
            for code in expand(c[0], r'SCR-[A-Z]+-\d+'): required.add(code)
if not required: problems.append('Không đọc được tập mã bắt buộc từ SRS-08 / SRS-00')

# --- Định nghĩa UIUX
u_def = collections.defaultdict(list); u_def_line = {}
for n, t in uiux.items():
    for line in t.splitlines():
        m = re.match(r'\|\s*(' + UIUX_RE + r')\s*\|', line) or re.match(r'#{3,4}\s+(' + UIUX_RE + r')\b', line)
        if m:
            u_def[m.group(1)].append(n); u_def_line[m.group(1)] = line
dups = {k: v for k, v in u_def.items() if len(v) > 1}
for k, v in sorted(dups.items()): problems.append(f'Mã UIUX định nghĩa nhiều lần: {k} ({", ".join(v)})')
for k, line in u_def_line.items():
    if (k.startswith('SCR-ADM') or k.startswith('FRP-ADM')) and 'đề xuất' not in line and 'đã duyệt' not in line:
        problems.append(f'{k} là đề xuất bổ sung nhưng dòng định nghĩa thiếu nhãn "đề xuất" hoặc "đã duyệt"')

# --- Tham chiếu
for n, t in uiux.items():
    for c in sorted(set(re.findall(r'\b' + UIUX_RE + r'\b', t))):
        if c not in u_def: problems.append(f'{n}: tham chiếu mã UIUX chưa định nghĩa {c}')
    t2 = re.sub(r'\bSCR-ADM-\d+', '', t)
    for c in sorted(set(expand(t2, SRS_RE))):
        if c.startswith('AC-'):
            if c not in srs_all_text: problems.append(f'{n}: {c} không có trong SRS')
        elif c not in srs_def: problems.append(f'{n}: mã SRS chưa định nghĩa {c}')
    if ddd:
        for c in sorted(set(expand(t, DDD_RE))):
            if c not in ddd_def: problems.append(f'{n}: mã DDD chưa định nghĩa {c}')

# --- Bảng truy vết
cov = collections.defaultdict(lambda: collections.defaultdict(set))   # srs -> doc -> {uiux codes}
for n, t in uiux.items():
    doc = n[:7] if n[5:7].isdigit() else n
    m = re.search(r'\n## \d+\. Truy vết\n(.*?)(?:\n## |\Z)', t, re.S)
    if not m: problems.append(f'{n}: thiếu mục "Truy vết"'); continue
    for line in m.group(1).splitlines():
        c = cells(line)
        if len(c) < 2 or c[0] in ('SRS',) or set(c[0]) <= set('-: '): continue
        scodes = expand(re.sub(r'\bSCR-ADM-\d+', '', c[0]), SRS_RE)
        ucodes = re.findall(r'\b' + UIUX_RE + r'\b', c[1])
        for s in scodes: cov[s][doc].update(ucodes)
missing = sorted(required - set(cov), key=nkey)
for c in missing: problems.append(f'Chưa phủ: {c}')

# --- Phụ lục
def fmt_docs(d): return '; '.join(f'{k}: {", ".join(sorted(v, key=nkey)) or "—"}' for k, v in sorted(d.items()))
def title_of(code):
    for t in srs.values():
        for line in t.splitlines():
            c = cells(line)
            if c and c[0] == code and len(c) > 1:
                s = c[1]; return s if len(s) <= 90 else s[:87] + '…'
    return ''
L = ['# UIUX-00 Phụ lục A: Ma trận truy vết SRS → UIUX', '',
     '| Mục | Nội dung |', '|---|---|', '| Mã tài liệu | UIUX-00-PL-A |', '| Phiên bản | 1.0 |',
     '| Trạng thái | Đã duyệt (Huy, 23/11/2026) |',
     '| Cách sinh | Sinh tự động bằng `tools/uiux-trace.py` từ mục "Truy vết" của UIUX-00…04; không sửa tay |', '',
     '## A.1 Yêu cầu và màn hình Web Studio bắt buộc phủ', '',
     'Tập gồm mọi FR, NFR, UC, SCR, ERR, MSG của SRS-08 và mọi màn hình kênh Web ở SRS-00 mục 7.', '',
     '| Mã SRS | Nội dung (rút gọn) | UIUX phủ |', '|---|---|---|']
for c in sorted(required, key=nkey):
    L.append(f'| {c} | {title_of(c)} | {fmt_docs(cov[c]) if c in cov else "**CHƯA PHỦ**"} |')
others = sorted(set(cov) - required, key=nkey)
L += ['', '## A.2 Mã SRS khác được UIUX phủ (panel chuyên biệt, quy tắc, ràng buộc)', '',
      '| Mã SRS | UIUX phủ |', '|---|---|']
for c in others: L.append(f'| {c} | {fmt_docs(cov[c])} |')
L += ['', '## A.3 Đề xuất bổ sung của UIUX (SCR-ADM, FRP-ADM) và trạng thái', '', '| Mã | Định nghĩa ở | Dòng định nghĩa (rút gọn) |', '|---|---|---|']
for k in sorted([k for k in u_def if k.startswith(('SCR-ADM', 'FRP-ADM'))], key=nkey):
    c = cells(u_def_line[k]); txt = ' · '.join(x for x in c[1:3] if x)
    L.append(f'| {k} | {u_def[k][0]} | {txt[:140] + ("…" if len(txt) > 140 else "")} |')
L += ['', '## A.4 Số mã UIUX theo loại và tài liệu', '']
types = ['WF', 'UF', 'CMP', 'TOK', 'UXR', 'TXT', 'UT', 'OIU', 'SCR-ADM', 'FRP-ADM']
docs = sorted(uiux)
L += ['| Loại | ' + ' | '.join(d[:7] for d in docs) + ' | Tổng |', '|---|' + '---|' * (len(docs) + 1)]
for ty in types:
    row = [sum(1 for k, v in u_def.items() if v[0] == d and (k.startswith(ty + '-') if '-' in ty else k.split('-')[0] == ty)) for d in docs]
    L.append(f'| {ty} | ' + ' | '.join(str(x) for x in row) + f' | {sum(row)} |')
L += ['', '## A.5 Kết quả kiểm', '',
      f'- Mã bắt buộc: {len(required)}; đã phủ: {len(required) - len(missing)}; chưa phủ: {len(missing)}',
      f'- Mã SRS khác được phủ: {len(others)}',
      f'- Mã UIUX định nghĩa: {len(u_def)}; trùng: {len(dups)}',
      f'- Vấn đề: {len(problems)}']
L += [f'  - {p}' for p in problems[:50]]
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(f'Bắt buộc {len(required)}, đã phủ {len(required) - len(missing)}; SRS khác {len(others)}; mã UIUX {len(u_def)}; vấn đề {len(problems)}')
for p in problems: print(' -', p)
sys.exit(1 if problems else 0)
