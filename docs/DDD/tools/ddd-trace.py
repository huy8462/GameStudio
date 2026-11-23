#!/usr/bin/env python3
"""Kiểm truy vết TSD -> DDD (và SRS -> DDD) và sinh Phụ lục A của DDD.
Cách chạy (từ thư mục gốc repo): python docs/DDD/tools/ddd-trace.py
Mặc định: DDD = docs/DDD, TSD = docs/TSD, SRS = docs/SRS. Ghi đè: ddd-trace.py <DDD> <TSD> <SRS>
Kiểm:
  1. Mọi mã TSD (TD, ALG, SCH, IF, TST) định nghĩa trong TSD-00…09 có mặt trong mục "Truy vết" của ít nhất một DDD.
  2. Mọi FR và NFR định nghĩa trong SRS có mặt trong mục "Truy vết" của ít nhất một DDD.
  3. Mã DDD (MOD, DTO, TBL, EP, SEQ, STM, PSC, CFG, TC, OID) không định nghĩa trùng. Định nghĩa = ô đầu của
     dòng bảng "| MÃ |" hoặc tiêu đề "### MÃ …" / "#### MÃ …".
  4. Mọi mã DDD được tham chiếu đều đã định nghĩa; mọi mã TSD/SRS tham chiếu trong DDD đều có trong TSD/SRS.
Dải mã viết được dạng "PSC-WEB-01…04", "TC-INT-01, 03", "TD-01…18".
Mã thoát 0 khi sạch, 1 khi có vấn đề."""
import re, glob, os, sys, collections
here = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(here)
T = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(D), 'TSD')
S = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(D), 'SRS')
OUT = os.path.join(D, 'DDD-00-PL-A-MA-TRAN-TRUY-VET.md')

SRS_KINDS = 'FR|NFR|QT|UC|SCR|API|ERR'
TSD_KINDS = 'ALG|SCH|IF|TST|OIT'
DDD_KINDS = 'MOD|DTO|TBL|EP|SEQ|STM|PSC|CFG|TC|OID'

def read(p): return open(p, encoding='utf-8').read()

def expand(text, kinds):
    out = []
    pat = re.compile(r'\b(' + kinds + r')-([A-Z]+)-(\d+)((?:\s*(?:…|\.\.\.|,)\s*\d+(?![\d.]*-))*)')
    for m in pat.finditer(text):
        k, g, first, tail = m.group(1), m.group(2), int(m.group(3)), m.group(4)
        w = len(m.group(3)); nums = [first]; prev = first
        for sep, n in re.findall(r'(…|\.\.\.|,)\s*(\d+)', tail):
            n = int(n)
            nums += list(range(prev + 1, n + 1)) if sep != ',' and n > prev else [n]
            prev = n
        out += [f'{k}-{g}-{x:0{w}d}' for x in nums]
    return out

def expand_td(text):
    out = []
    for m in re.finditer(r'\bTD-(\d+)((?:\s*(?:…|,)\s*\d+(?![\d.]*-))*)', text):
        first = int(m.group(1)); nums = [first]; prev = first
        for sep, n in re.findall(r'(…|,)\s*(\d+)', m.group(2)):
            n = int(n); nums += list(range(prev + 1, n + 1)) if sep == '…' and n > prev else [n]; prev = n
        out += [f'TD-{x:02d}' for x in nums]
    return out

def trace_sections(t):
    return re.findall(r'^##\s+\d*\.?\s*Truy vết.*?(?=^##\s|\Z)', t, flags=re.M | re.S)

def strip_code(t):
    # bỏ khối mã ``` để ví dụ trong mã không bị coi là tham chiếu
    return re.sub(r'```.*?```', '', t, flags=re.S)

# 1. SRS
srs_def = {}
for f in sorted(glob.glob(os.path.join(S, 'SRS-*.md'))):
    if 'PL-A' in f: continue
    for line in read(f).splitlines():
        m = re.match(r'\|\s*((?:' + SRS_KINDS + r'|OI)-[A-Z]+-\d+)\s*\|', line)
        if m: srs_def.setdefault(m.group(1), os.path.basename(f)[:6])
need_fr = sorted(c for c in srs_def if c.startswith('FR-') or c.startswith('NFR-'))

# 2. TSD
tsd_def = {}
for f in sorted(glob.glob(os.path.join(T, 'TSD-*.md'))):
    if 'PL-A' in f: continue
    for line in read(f).splitlines():
        m = re.match(r'\|\s*((?:' + TSD_KINDS + r')-[A-Z]+-\d+|TD-\d+)\s*\|', line)
        if m: tsd_def.setdefault(m.group(1), os.path.basename(f)[:6])
need_tsd = sorted(c for c in tsd_def if not c.startswith('OIT-'))

# 3. DDD
ddd = {os.path.basename(f): read(f) for f in sorted(glob.glob(os.path.join(D, 'DDD-*.md'))) if 'PL-A' not in f}
defined = collections.defaultdict(list)
for n, t in ddd.items():
    for line in t.splitlines():
        m = re.match(r'\|\s*((?:' + DDD_KINDS + r')-[A-Z]+-\d+)\s*\|', line) or \
            re.match(r'#{3,4}\s+((?:' + DDD_KINDS + r')-[A-Z]+-\d+)\b', line)
        if m: defined[m.group(1)].append(n)
dups = {k: v for k, v in defined.items() if len(v) > 1}

cov_tsd = collections.defaultdict(set); cov_fr = collections.defaultdict(set)
undef_ddd = set(); undef_tsd = set(); undef_srs = set()
for n, t in ddd.items():
    for sec in trace_sections(t):
        for c in expand(sec, 'ALG|SCH|IF|TST') + expand_td(sec): cov_tsd[c].add(n[:6])
        for c in expand(sec, 'FR|NFR'): cov_fr[c].add(n[:6])
    body = strip_code(t)
    for c in expand(body, DDD_KINDS):
        if c not in defined: undef_ddd.add((c, n))
    for c in expand(body, TSD_KINDS) + expand_td(body):
        if c not in tsd_def: undef_tsd.add((c, n))
    for c in expand(body, SRS_KINDS):
        if c not in srs_def: undef_srs.add((c, n))

miss_tsd = [c for c in need_tsd if c not in cov_tsd]
miss_fr = [c for c in need_fr if c not in cov_fr]

def key(c):
    p = c.split('-'); return (p[0], p[1] if len(p) > 2 else '', int(p[-1]))
L = ['# DDD-00 Phụ lục A: Ma trận truy vết TSD/SRS → DDD', '',
     '| Mục | Nội dung |', '|---|---|', '| Mã tài liệu | DDD-00-PL-A |', '| Phiên bản | 0.1 |', '| Ngày | 22/11/2026 |',
     '| Cách sinh | Sinh tự động bằng `tools/ddd-trace.py` từ mục "Truy vết" của DDD-00…09; không sửa tay |', '',
     '## A.1 Thành phần TSD → DDD', '', '| Mã TSD | TSD | DDD phủ |', '|---|---|---|']
for c in sorted(need_tsd, key=key):
    L.append(f'| {c} | {tsd_def[c]} | {", ".join(sorted(cov_tsd.get(c, []))) or "**CHƯA PHỦ**"} |')
L += ['', '## A.2 Yêu cầu SRS (FR, NFR) → DDD', '', '| Mã | SRS | DDD phủ |', '|---|---|---|']
for c in sorted(need_fr, key=key):
    L.append(f'| {c} | {srs_def[c]} | {", ".join(sorted(cov_fr.get(c, []))) or "**CHƯA PHỦ**"} |')
cnt = collections.Counter(n[:6] for v in defined.values() for n in v)
kinds = collections.Counter(k.split('-')[0] for k in defined)
L += ['', '## A.3 Mã DDD theo tài liệu', '', '| DDD | Số mã định nghĩa |', '|---|---|']
L += [f'| {k} | {v} |' for k, v in sorted(cnt.items())]
L += ['', '## A.4 Mã DDD theo loại', '', '| Loại | Số mã |', '|---|---|']
L += [f'| {k} | {v} |' for k, v in sorted(kinds.items())]
L += ['', '## A.5 Tổng hợp', '', '| Chỉ số | Giá trị |', '|---|---|',
      f'| Mã TSD cần phủ (TD, ALG, SCH, IF, TST) | {len(need_tsd)} |', f'| Mã TSD chưa phủ | {len(miss_tsd)} |',
      f'| FR + NFR trong SRS | {len(need_fr)} |', f'| FR/NFR chưa phủ | {len(miss_fr)} |',
      f'| Mã DDD định nghĩa | {len(defined)} |', f'| Mã DDD trùng | {len(dups)} |',
      f'| Tham chiếu chưa định nghĩa | {len(undef_ddd) + len(undef_tsd) + len(undef_srs)} |']
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(f'TSD cần phủ: {len(need_tsd)}, chưa phủ: {miss_tsd or "không"}')
print(f'FR+NFR: {len(need_fr)}, chưa phủ: {miss_fr or "không"}')
print(f'Mã DDD: {len(defined)}; trùng: {dups or "không"}')
print('Tham chiếu DDD chưa định nghĩa:', sorted(undef_ddd) or 'không')
print('Tham chiếu TSD không có:', sorted(undef_tsd) or 'không')
print('Tham chiếu SRS không có:', sorted(undef_srs) or 'không')
print('Đã ghi', OUT)
sys.exit(1 if (miss_tsd or miss_fr or dups or undef_ddd or undef_tsd or undef_srs) else 0)
