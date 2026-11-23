#!/usr/bin/env python3
"""Kiểm truy vết SRS và sinh Phụ lục A.
Cách chạy (từ thư mục gốc repo): python docs/SRS/tools/srs-trace.py
Mặc định: SRS = docs/SRS, BRD = docs/BRD. Ghi đè: srs-trace.py <thu-muc-SRS> <thu-muc-BRD>
Kết quả: in số BR chưa phủ, mã trùng, tham chiếu chưa định nghĩa; ghi lại SRS-00-PL-A-MA-TRAN-TRUY-VET.md.
Mã thoát 0 khi sạch, 1 khi có vấn đề."""
import re,glob,os,sys,collections
here=os.path.dirname(os.path.abspath(__file__))
S=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(here)
B=sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(os.path.dirname(here)),'BRD')
OUT=os.path.join(S,'SRS-00-PL-A-MA-TRAN-TRUY-VET.md')
def norm(c):
    a=c[3:].split('.'); return 'BR-%02d'%int(a[0]) + ('.'+a[1] if len(a)>1 else '')
def key(c): return [int(p) for p in c[3:].split('.')]
def cells_of(line): return [c.strip() for c in line.replace('\\|','/').split('|')]
srs={os.path.basename(f):open(f,encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(S,'SRS-*.md')))}
# 1. Định nghĩa mã
defined=collections.defaultdict(list)
for n,t in srs.items():
    for line in t.splitlines():
        m=re.match(r'\|\s*((?:FR|NFR|QT|UC|SCR|API|ERR|OI)-[A-Z]+-\d+)\s*\|',line)
        if m: defined[m.group(1)].append(n)
dups={k:v for k,v in defined.items() if len(v)>1 and not k.startswith('SCR-')}
undef=sorted({(c,n) for n,t in srs.items() for c in re.findall(r'\b(?:FR|SCR|API|ERR|QT|UC|NFR)-[A-Z]+-\d+\b',t) if c not in defined})
# 2. BRD
top={}; det={}; detsrc={}
for f in sorted(glob.glob(os.path.join(B,'BRD-*.md'))):
    bn=os.path.basename(f); doc='00' if bn.startswith('BRD-TONG') else bn.split('-')[1]
    for line in open(f,encoding='utf-8'):
        c=cells_of(line)
        if doc=='00' and len(c)>5 and re.fullmatch(r'BR-\d+',c[1]): top[norm(c[1])]=(c[2],c[3],c[5])
        if len(c)>3 and re.fullmatch(r'BR-\d+\.\d+',c[1]):
            k=norm(c[1]); det.setdefault(k,(c[2],c[3])); detsrc.setdefault(k,'BRD-'+doc)
# 3. FR -> BR
fr=collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(S,'SRS-0[1-9]-*.md'))):
    doc='SRS-'+os.path.basename(f)[4:6]
    for line in open(f,encoding='utf-8'):
        c=cells_of(line)
        if len(c)>4 and re.fullmatch(r'FR-[A-Z]+-\d+',c[1]):
            for b in re.findall(r'BR-\d+(?:\.\d+)?',c[3]): fr[norm(b)].append((doc,c[1]))
def fmt(lst):
    by={}
    for d,c in lst:
        by.setdefault(d,[])
        if c not in by[d]: by[d].append(c)
    for d in by: by[d].sort(key=lambda x:(x.rsplit('-',1)[0],int(x.rsplit('-',1)[1])))
    return '; '.join(f"{d}: {', '.join(v)}" for d,v in sorted(by.items()))
def short(t,n): return t if len(t)<=n else t[:n-3]+'…'
L=['# SRS-00 Phụ lục A: Ma trận truy vết BRD → SRS','',
'| Mục | Nội dung |','|---|---|','| Mã tài liệu | SRS-00-PL-A |','| Phiên bản | 1.0 |','| Trạng thái | Đã duyệt (Huy, 22/11/2026) |','| Ngày | 22/11/2026 |',
'| Cách sinh | Sinh tự động bằng `tools/srs-trace.py` từ cột "Nguồn" của bảng yêu cầu chức năng trong SRS-01…09; không sửa tay |','',
'## A.1 Yêu cầu nghiệp vụ tổng quan (BRD-00)','','| BR | Yêu cầu (rút gọn) | Ưu tiên | Pha | Yêu cầu chức năng SRS |','|---|---|---|---|---|']
miss_top=[]
for c in sorted(top,key=key):
    t,p,ph=top[c]; lst=[x for k,v in fr.items() if k==c or k.startswith(c+'.') for x in v]
    if not lst: miss_top.append(c)
    L.append(f'| {c} | {short(t,110)} | {p} | {ph} | {fmt(lst) or "**CHƯA PHỦ**"} |')
L+=['','## A.2 Yêu cầu chi tiết (BRD-01…09)','','| BR chi tiết | BRD | Yêu cầu (rút gọn) | Ưu tiên | Yêu cầu chức năng SRS |','|---|---|---|---|---|']
miss_det=[]
for c in sorted(det,key=key):
    t,p=det[c]; s=fmt(fr.get(c,[]))
    if not s: miss_det.append(c)
    L.append(f'| {c} | {detsrc[c]} | {short(t,100)} | {p} | {s or "**CHƯA PHỦ**"} |')
nfr=len({k for k in defined if k.startswith('FR-')}); traced=len({x[1] for v in fr.values() for x in v})
L+=['','## A.3 Tổng hợp','','| Chỉ số | Giá trị |','|---|---|',
f'| BR tổng quan | {len(top)} |',f'| BR tổng quan chưa phủ | {len(miss_top)} |',
f'| BR chi tiết | {len(det)} |',f'| BR chi tiết chưa phủ | {len(miss_det)} |',
f'| Yêu cầu chức năng (FR) | {nfr} |',f'| FR truy vết trực tiếp tới BR | {traced} |']
open(OUT,'w',encoding='utf-8').write('\n'.join(L)+'\n')
print(f'BR tổng quan: {len(top)}, chưa phủ: {miss_top}')
print(f'BR chi tiết: {len(det)}, chưa phủ: {miss_det}')
print(f'FR: {nfr}, truy vết tới BR: {traced}')
print('Mã định nghĩa trùng:', dups or 'không')
print('Tham chiếu chưa định nghĩa:', undef or 'không')
print('Đã ghi', OUT)
sys.exit(1 if (miss_top or miss_det or dups or undef) else 0)
