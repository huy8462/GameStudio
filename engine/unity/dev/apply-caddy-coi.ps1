# T-0019: Huy tự chạy (PowerShell quản trị). Thêm tiêu đề COOP/COEP vào khối gamestudio.vinpride.com của C:\caddy\Caddyfile
# để bản Web đa luồng (gamestudio-player-mt) có SharedArrayBuffer; kiểm cấu hình rồi khởi động lại tác vụ caddy-proxy.
# Sao lưu: C:\caddy\Caddyfile.truoc-coi. Hoàn tác: chép lại bản sao lưu rồi khởi động lại caddy-proxy.
param([string]$Caddyfile = 'C:\caddy\Caddyfile', [string]$Task = 'caddy-proxy')
$ErrorActionPreference = 'Stop'
$caddy = Join-Path (Split-Path $Caddyfile) 'caddy.exe'
$s = [IO.File]::ReadAllText($Caddyfile)
if ($s.Contains('Cross-Origin-Embedder-Policy')) { throw 'Caddyfile đã có COEP.' }
$anchor = "`theader Cache-Control `"no-cache`""
$i = $s.IndexOf('gamestudio.vinpride.com {')
if ($i -lt 0) { throw 'Không thấy khối gamestudio.vinpride.com riêng.' }
$j = $s.IndexOf($anchor, $i)
if ($j -lt 0) { throw "Không thấy dòng Cache-Control trong khối gamestudio." }
$add = "`r`n`theader Cross-Origin-Opener-Policy same-origin`r`n`theader Cross-Origin-Embedder-Policy require-corp"
Copy-Item $Caddyfile "$Caddyfile.truoc-coi" -Force
$s = $s.Insert($j + $anchor.Length, $add)
$tmp = "$Caddyfile.moi"
[IO.File]::WriteAllText($tmp, $s, (New-Object Text.UTF8Encoding $false))
& $caddy validate --config $tmp --adapter caddyfile
if ($LASTEXITCODE -ne 0) { Remove-Item $tmp; throw 'caddy validate lỗi, Caddyfile giữ nguyên.' }
Move-Item $tmp $Caddyfile -Force
Stop-ScheduledTask -TaskName $Task
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $Task
Start-Sleep -Seconds 5
foreach ($u in 'https://gamestudio.vinpride.com/gamestudio-player-mt/', 'https://chuaonline.vinpride.com/poc') {
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 20; "$u -> $($r.StatusCode) COEP=$($r.Headers['Cross-Origin-Embedder-Policy'])" } catch { "$u -> $($_.Exception.Message)" }
}
