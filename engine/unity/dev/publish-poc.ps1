# T-0022 (POC-U1, NFR-RTM-01): chép một bản build Unity Web lên máy chủ poc trên máy này (C:\poc-public\split\<Name>).
# Máy chủ poc chỉ phục vụ đuôi .html .js .json .glb .ktx2 .wasm .bin nên đổi tên tệp .unityweb và sửa index.html.
# Loader Unity tự giải nén Brotli (decompression fallback).
# Xuất bản là gửi ra ngoài: chỉ chạy khi Huy đã đồng ý. Gỡ: Remove-Item C:\poc-public\split\<Name> -Recurse
# Dùng: engine\unity\dev\publish-poc.ps1 -Src engine\unity\Build\player -Name gamestudio-player [-Prefix player]
param(
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Prefix = 'player',
  [string]$PocRoot = 'C:\poc-public'
)
$ErrorActionPreference = 'Stop'
if ($Name -notmatch '^gamestudio-[a-z0-9-]+$') { throw "Tên thư mục phải dạng gamestudio-<tên>: $Name" }
$Src = (Resolve-Path $Src).Path
$dst = Join-Path $PocRoot ("split\" + $Name)
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $dst 'Build') | Out-Null
$map = [ordered]@{
  "$Prefix.data.unityweb"         = "$Prefix.data.bin"
  "$Prefix.framework.js.unityweb" = "$Prefix.framework.js"
  "$Prefix.wasm.unityweb"         = "$Prefix.wasm"
  "$Prefix.loader.js"             = "$Prefix.loader.js"
}
foreach ($k in $map.Keys) { Copy-Item (Join-Path $Src "Build\$k") (Join-Path $dst "Build\$($map[$k])") }
foreach ($sub in 'StreamingAssets', 'data') {
  if (Test-Path (Join-Path $Src $sub)) { Copy-Item (Join-Path $Src $sub) $dst -Recurse }
}
$html = [IO.File]::ReadAllText((Join-Path $Src 'index.html'))
foreach ($k in $map.Keys) { $html = $html.Replace("Build/$k'", "Build/$($map[$k])'") }
[IO.File]::WriteAllText((Join-Path $dst 'index.html'), $html, (New-Object Text.UTF8Encoding $false))
$files = Get-ChildItem $dst -Recurse -File
"{0} -> split/{1}: {2} tệp, {3:N2} MB" -f (Split-Path $Src -Leaf), $Name, $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB)
