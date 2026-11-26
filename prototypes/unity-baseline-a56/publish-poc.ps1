# POC-U1 (CR-02, ADR-036): chép Build/S0, Build/S1 lên máy chủ poc trên máy này (C:\poc-public\split\gamestudio-unity-s0|s1).
# Máy chủ poc chỉ phục vụ đuôi .html .js .json .glb .ktx2 .wasm .bin ... nên đổi tên tệp Unity (.unityweb) và sửa index.html.
# Loader Unity tự giải nén Brotli (decompression fallback), máy chủ có thể gzip thêm lần nữa: trình duyệt tự gỡ.
# Xuất bản là gửi ra ngoài: chỉ chạy khi Huy đã đồng ý. Gỡ: Remove-Item C:\poc-public\split\gamestudio-unity-s0, ...-s1 -Recurse
param([string]$PocRoot = 'C:\poc-public')
$ErrorActionPreference = 'Stop'
$proj = Join-Path $PSScriptRoot 'UnityProject\Build'
foreach ($id in 'S0', 'S1') {
  $src = Join-Path $proj $id
  $dst = Join-Path $PocRoot ("split\gamestudio-unity-" + $id.ToLower())
  if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
  New-Item -ItemType Directory -Force (Join-Path $dst 'Build') | Out-Null
  $map = @{
    "$id.data.unityweb" = "$id.data.bin"
    "$id.framework.js.unityweb" = "$id.framework.js"
    "$id.wasm.unityweb" = "$id.wasm"
    "$id.loader.js" = "$id.loader.js"
  }
  foreach ($k in $map.Keys) { Copy-Item (Join-Path $src "Build\$k") (Join-Path $dst "Build\$($map[$k])") }
  if (Test-Path (Join-Path $src 'StreamingAssets')) { Copy-Item (Join-Path $src 'StreamingAssets') $dst -Recurse }
  $html = [IO.File]::ReadAllText((Join-Path $src 'index.html'))
  foreach ($k in $map.Keys) { $html = $html.Replace("Build/$k'", "Build/$($map[$k])'") }
  [IO.File]::WriteAllText((Join-Path $dst 'index.html'), $html, (New-Object Text.UTF8Encoding $false))
  $sum = (Get-ChildItem $dst -Recurse -File | Measure-Object Length -Sum).Sum
  "{0} -> split/{1}: {2} tệp, {3:N2} MB" -f $id, (Split-Path $dst -Leaf), (Get-ChildItem $dst -Recurse -File).Count, ($sum / 1MB)
}
