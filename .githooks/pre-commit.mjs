// Pre-commit (IF-DEV-05, EP-DEV-06, MOD-DEV-13): gitleaks trên phần đã stage, CLAUDE.md < 150 dòng.
// `engine validate --staged` thêm khi có @gamestudio/schema (E1). Lỗi → thoát 1, huỷ commit.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();
const errors = [];

// 1. Quét bí mật trên phần đã stage. gitleaks phải có trong PATH (tools/versions.json, engine doctor).
// gitleaks là tệp .exe thật (không phải shim .cmd) nên gọi trực tiếp, không qua shell.
const gl = spawnSync(
  'gitleaks',
  ['git', '--staged', '--redact', '--no-banner', '--config', join(root, 'gitleaks.toml'), root],
  { encoding: 'utf8' },
);
if (gl.error || gl.status === null) {
  errors.push('Không chạy được gitleaks (cài và thêm vào PATH; xem pnpm doctor).');
} else if (gl.status !== 0) {
  errors.push(`gitleaks phát hiện bí mật trong phần đã stage (mã ${gl.status}). Gỡ khỏi stage, không commit.`);
  process.stderr.write(gl.stdout + gl.stderr);
}

// 2. CLAUDE.md < 150 dòng (FR-DEV-14).
const claude = join(root, 'CLAUDE.md');
if (existsSync(claude)) {
  const lines = readFileSync(claude, 'utf8').split('\n').length - 1;
  if (lines >= 150) errors.push(`CLAUDE.md có ${lines} dòng, cần < 150 (FR-DEV-14).`);
}

if (errors.length > 0) {
  for (const e of errors) process.stderr.write(`[pre-commit] ${e}\n`);
  process.exitCode = 1;
}
