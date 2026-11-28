# T-0022 (POC-U1, NFR-RTM-01): chép một bản build Unity Web lên thư mục poc RIÊNG của GameStudio (C:\poc-gamestudio\<Name>).
# Caddy phục vụ thẳng thư mục này cho gamestudio.vinpride.com (khối mẫu: engine/unity/dev/caddy-gamestudio.txt),
# không đi qua máy chủ poc và thư mục split của chuaonline, nên chuaonline xuất bản lại không làm mất bản build.
# Chép nguyên bản build (giữ .unityweb); Caddy gắn Content-Encoding br nên trình duyệt tự giải nén Brotli.
# Xuất bản là gửi ra ngoài: chỉ chạy khi Huy đã đồng ý. Gỡ: Remove-Item C:\poc-gamestudio\<Name> -Recurse
# Dùng: engine\unity\dev\publish-poc.ps1 -Src engine\unity\Build\player -Name gamestudio-player
# Địa chỉ: https://gamestudio.vinpride.com/<Name>/?perf=1 (đường cũ /split/<Name>/index.html vẫn chạy)
param(
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Root = 'C:\poc-gamestudio'
)
$ErrorActionPreference = 'Stop'
if ($Name -notmatch '^gamestudio-[a-z0-9-]+$') { throw "Tên thư mục phải dạng gamestudio-<tên>: $Name" }
$Src = (Resolve-Path $Src).Path
if (-not (Test-Path (Join-Path $Src 'index.html'))) { throw "Không thấy index.html trong bản build: $Src" }
New-Item -ItemType Directory -Force $Root | Out-Null
$dst = Join-Path $Root $Name
$tmp = "$dst.tmp"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Copy-Item $Src $tmp -Recurse
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Rename-Item $tmp $Name
# Trang mục lục các bản build ở gốc.
$items = Get-ChildItem $Root -Directory | Where-Object Name -match '^gamestudio-' | Sort-Object Name |
  ForEach-Object { "<li><a href=""$($_.Name)/?perf=1"">$($_.Name)</a></li>" }
$page = "<!doctype html><meta charset=utf-8><title>GameStudio poc</title><h1>GameStudio poc</h1><ul>$($items -join '')</ul>"
[IO.File]::WriteAllText((Join-Path $Root 'index.html'), $page, (New-Object Text.UTF8Encoding $false))
$files = Get-ChildItem $dst -Recurse -File
"{0} -> {1}: {2} tệp, {3:N2} MB" -f (Split-Path $Src -Leaf), $Name, $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB)
