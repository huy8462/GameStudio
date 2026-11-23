#!/usr/bin/env python3
"""Kiểm truy vết SRS -> TSD và sinh Phụ lục A của TSD.
Cách chạy (từ thư mục gốc repo): python docs/TSD/tools/tsd-trace.py
Mặc định: TSD = docs/TSD, SRS = docs/SRS. Ghi đè: tsd-trace.py <thu-muc-TSD> <thu-muc-SRS>
Kiểm:
  1. Mọi FR và NFR định nghĩa trong SRS có mặt trong mục "Truy vết" của ít nhất một TSD.
  2. Mã TSD (TD, ALG, SCH, IF, TST, OIT) không định nghĩa trùng.
  3. Mọi mã TSD được tham chiếu đều đã định nghĩa; mọi FR/NFR/API/ERR/SCR/QT/UC tham chiếu trong TSD có trong SRS.
Dải mã viết được dạng "FR-INT-01…07", "FR-INT-01, 03, 05", "FR-RTM-01…06, 23".
Mã thoát 0 khi sạch, 1 khi có vấn đề."""
import re, glob, os, sys, collections
here = os.path.dirname(os.path.abspath(__file__))
T = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(here)
S = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(T), 'SRS')
OUT = os.path.join(T, 'TSD-00-PL-A-MA-TRAN-TRUY-VET.md')

SRS_KINDS = 'FR|NFR|QT|UC|SCR|API|ERR|OI'
TSD_KINDS = 'TD|ALG|SCH|IF|TST|OIT'

def read(p): return open(p, encoding='utf-8').read()

def expand(text, kinds):
    """Trả về danh sách mã, mở rộng dải '…' và danh sách ', nn'."""
    out = []
    pat = re.compile(r'\b(' + kinds + r')-([A-Z]+)-(\d+)((?:\s*(?:…|\.\.\.|,)\s*\d+(?![\d.]*-))*)')
    for m in pat.finditer(text):
        k, g, first, tail = m.group(1), m.group(2), int(m.group(3)), m.group(4)
        w = len(m.group(3))
        nums = [first]; prev = first
        for sep, n in re.findall(r'(…|\.\.\.|,)\s*(\d+)', tail):
            n = int(n)
            if sep != ',' and n > prev:
                nums += list(range(prev + 1, n + 1))
            else:
                nums.append(n)
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

# 1. Mã SRS
srs_def = {}
srs_doc = {}
for f in sorted(glob.glob(os.path.join(S, 'SRS-*.md'))):
    if 'PL-A' in f: continue
    bn = os.path.basename(f)[:6]
    for line in read(f).splitlines():
        m = re.match(r'\|\s*((?:' + SRS_KINDS + r')-[A-Z]+-\d+)\s*\|', line)
        if m:
            srs_def.setdefault(m.group(1), bn)
for c, d in srs_def.items(): srs_doc[c] = d
need = sorted([c for c in srs_def if c.startswith('FR-') or c.startswith('NFR-')])

# 2. TSD
tsd = {os.path.basename(f): read(f) for f in sorted(glob.glob(os.path.join(T, 'TSD-*.md'))) if 'PL-A' not in f}
defined = collections.defaultdict(list)
for n, t in tsd.items():
    for line in t.splitlines():
        m = re.match(r'\|\s*((?:ALG|SCH|IF|TST|OIT)-[A-Z]+-\d+|TD-\d+)\s*\|', line)
        if m: defined[m.group(1)].append(n)
dups = {k: v for k, v in defined.items() if len(v) > 1}

covered = collections.defaultdict(set)
undef_srs = set(); undef_tsd = set()
for n, t in tsd.items():
    # mục truy vết: từ heading chứa "Truy vết" tới heading cùng cấp tiếp theo
    for sec in re.findall(r'^##\s+\d*\.?\s*Truy vết.*?(?=^##\s|\Z)', t, flags=re.M | re.S):
        for c in expand(sec, 'FR|NFR'):
            covered[c].add(n[:6])
    for c in expand(t, SRS_KINDS):
        if c not in srs_def and not c.startswith('OI-'):
            undef_srs.add((c, n))
    for c in expand(t, 'ALG|SCH|IF|TST|OIT') + expand_td(t):
        if c not in defined: undef_tsd.add((c, n))

missing = [c for c in need if c not in covered]

def grp(c): return c.rsplit('-', 1)[0]
def num(c): return int(c.rsplit('-', 1)[1])
L = ['# TSD-00 Phụ lục A: Ma trận truy vết SRS → TSD', '',
     '| Mục | Nội dung |', '|---|---|', '| Mã tài liệu | TSD-00-PL-A |', '| Phiên bản | 0.1 |', '| Ngày | 22/11/2026 |',
     '| Cách sinh | Sinh tự động bằng `tools/tsd-trace.py` từ mục "Truy vết" của TSD-00…09; không sửa tay |', '',
     '## A.1 Yêu cầu chức năng và phi chức năng → TSD', '',
     '| Mã | SRS | TSD phủ |', '|---|---|---|']
for c in sorted(need, key=lambda c: (c.split('-')[0], grp(c), num(c))):
    L.append(f'| {c} | {srs_doc[c]} | {", ".join(sorted(covered.get(c, []))) or "**CHƯA PHỦ**"} |')
cnt = collections.Counter(n[:6] for v in defined.values() for n in v)
L += ['', '## A.2 Mã TSD theo tài liệu', '', '| TSD | Số mã định nghĩa |', '|---|---|']
L += [f'| {k} | {v} |' for k, v in sorted(cnt.items())]
nfr = len([c for c in need if c.startswith('FR-')]); nnfr = len(need) - nfr
L += ['', '## A.3 Tổng hợp', '', '| Chỉ số | Giá trị |', '|---|---|',
      f'| FR trong SRS | {nfr} |', f'| FR chưa phủ | {len([c for c in missing if c.startswith("FR-")])} |',
      f'| NFR trong SRS | {nnfr} |', f'| NFR chưa phủ | {len([c for c in missing if c.startswith("NFR-")])} |',
      f'| Mã TSD định nghĩa | {len(defined)} |', f'| Mã TSD trùng | {len(dups)} |']
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(f'FR: {nfr}, NFR: {nnfr}, chưa phủ: {missing or "không"}')
print(f'Mã TSD: {len(defined)}; trùng: {dups or "không"}')
print('Tham chiếu SRS chưa định nghĩa:', sorted(undef_srs) or 'không')
print('Tham chiếu TSD chưa định nghĩa:', sorted(undef_tsd) or 'không')
print('Đã ghi', OUT)
sys.exit(1 if (missing or dups or undef_srs or undef_tsd) else 0)
