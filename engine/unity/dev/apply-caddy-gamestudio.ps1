# T-0022 (POC-U1): Huy tự chạy (PowerShell quản trị). Tách gamestudio.vinpride.com khỏi khối chuaonline trong
# C:\caddy\Caddyfile, thêm khối riêng từ caddy-gamestudio.txt, kiểm cấu hình rồi khởi động lại tác vụ caddy-proxy.
# Sao lưu: C:\caddy\Caddyfile.truoc-tach-gamestudio. Hoàn tác: chép lại bản sao lưu rồi khởi động lại caddy-proxy.
param([string]$Caddyfile = 'C:\caddy\Caddyfile', [string]$Task = 'caddy-proxy')
$ErrorActionPreference = 'Stop'
$caddy = Join-Path (Split-Path $Caddyfile) 'caddy.exe'
$block = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'caddy-gamestudio.txt'))
$s = [IO.File]::ReadAllText($Caddyfile)
if ($s -match '(?m)^gamestudio\.vinpride\.com \{') { throw 'Caddyfile đã có khối gamestudio riêng.' }
$old = 'chuaonline.vinpride.com, gamestudio.vinpride.com {'
if (-not $s.Contains($old)) { throw "Không thấy dòng: $old" }
Copy-Item $Caddyfile "$Caddyfile.truoc-tach-gamestudio" -Force
$s = $s.Replace($old, 'chuaonline.vinpride.com {')
$tmp = "$Caddyfile.moi"
[IO.File]::WriteAllText($tmp, $s.TrimEnd() + "`r`n`r`n" + $block, (New-Object Text.UTF8Encoding $false))
& $caddy validate --config $tmp --adapter caddyfile
if ($LASTEXITCODE -ne 0) { Remove-Item $tmp; throw 'caddy validate lỗi, Caddyfile giữ nguyên.' }
Move-Item $tmp $Caddyfile -Force
Stop-ScheduledTask -TaskName $Task
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $Task
Start-Sleep -Seconds 5
foreach ($u in 'https://gamestudio.vinpride.com/', 'https://chuaonline.vinpride.com/') {
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 20; "$u -> $($r.StatusCode)" } catch { "$u -> $($_.Exception.Message)" }
}
