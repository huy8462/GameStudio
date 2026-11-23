// Kiểm cấu trúc studio AI (TST-DEV-05 / TC-DEV-05, AC-09-01, MOD-DEV-14) và upstream (upstream-check, FR-DEV-13).
// Dùng: node tools/scripts/structure-check.mjs [--json]. Thoát 0 khi đạt, 1 khi có lỗi.
// Lệch có chủ đích so với TC-DEV-05: skill engine-* (10–15) chưa có ở E0 nên chỉ cảnh báo, chưa tính lỗi.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const C = join(ROOT, '.claude');
const UPSTREAM_SKILLS = [
  'threejs-game-director', 'threejs-gameplay-systems', 'threejs-aaa-graphics-builder', 'threejs-game-ui-designer',
  'threejs-debug-profiler', 'threejs-qa-release', 'threejs-image-generator', 'threejs-audio-generator',
];
const COMMANDS = [
  'start', 'new-game', 'ticket', 'build-zone', 'qa-light', 'qa-full', 'perf-snapshot', 'visual-diff', 'gate-check',
  'asset-recipe', 'adr', 'publish-poc', 'handoff', 'resume-game', 'import-game',
];
const HOOKS = ['h01-large-md', 'h02-binary-log', 'h03-schema', 'h04-secrets', 'h05-perf'];

const list = (dir, ext) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)) : []);
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });

export function checkStructure() {
  const errors = [];
  const warnings = [];
  const agents = list(join(C, 'agents'), '.md');
  if (agents.length === 0 || agents.length > 8) errors.push(`Số agent ${agents.length}, cần 1..8 (FR-DEV-01).`);
  for (const a of agents) {
    const text = readFileSync(join(C, 'agents', `${a}.md`), 'utf8').replace(/\r\n/g, '\n');
    const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    if (!/^name: /m.test(fm) || !/^description: /m.test(fm) || !/^model: (opus|sonnet|haiku)$/m.test(fm)) {
      errors.push(`Agent ${a}: frontmatter thiếu name/description/model (IF-DEV-01).`);
    }
  }
  const skills = existsSync(join(C, 'skills')) ? readdirSync(join(C, 'skills')) : [];
  for (const s of UPSTREAM_SKILLS) if (!skills.includes(s)) errors.push(`Thiếu skill gốc ${s} (FR-DEV-02).`);
  if (skills.includes('threejs-3d-generator')) errors.push('Còn skill threejs-3d-generator (QĐ-08).');
  const engineSkills = skills.filter((s) => s.startsWith('engine-')).length;
  if (engineSkills < 10) warnings.push(`Skill engine-*: ${engineSkills}/10–15 (thêm dần từ E1, FR-DEV-02).`);
  const cmds = list(join(C, 'commands'), '.md');
  for (const c of COMMANDS) if (!cmds.includes(c)) errors.push(`Thiếu lệnh /${c} (FR-DEV-03).`);
  for (const h of HOOKS) if (!existsSync(join(C, 'hooks', `${h}.mjs`))) errors.push(`Thiếu hook ${h} (FR-DEV-18).`);
  const claudeMd = join(ROOT, 'CLAUDE.md');
  const lines = existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8').split('\n').length - 1 : 0;
  if (lines === 0 || lines >= 150) errors.push(`CLAUDE.md ${lines} dòng, cần 1..149 (FR-DEV-14).`);
  for (const f of ['project.yaml', 'UPSTREAM.md', 'LICENSES.md', 'LICENSE', 'gitleaks.toml']) {
    if (!existsSync(join(ROOT, f))) errors.push(`Thiếu ${f}.`);
  }
  // upstream-check (DDD-09 PSC-DEV-09): LICENSE trùng vendor, UPSTREAM.md ghi đúng commit gốc.
  const vendor = git('rev-parse', 'vendor/upstream');
  if (vendor.status === 0) {
    if (git('diff', '--quiet', 'vendor/upstream', '--', 'LICENSE').status !== 0) errors.push('LICENSE khác vendor/upstream (FR-DEV-13).');
    const up = existsSync(join(ROOT, 'UPSTREAM.md')) ? readFileSync(join(ROOT, 'UPSTREAM.md'), 'utf8') : '';
    if (!up.includes(vendor.stdout.trim())) errors.push('UPSTREAM.md không ghi commit của vendor/upstream (QT-DEV-04).');
  } else warnings.push('Không có nhánh vendor/upstream: bỏ qua kiểm LICENSE.');
  return { ok: errors.length === 0, errors, warnings, counts: { agents: agents.length, skills: skills.length, commands: cmds.length, claudeMdLines: lines } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = checkStructure();
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(r) + '\n');
  else {
    for (const e of r.errors) process.stderr.write(`LỖI ${e}\n`);
    for (const w of r.warnings) process.stderr.write(`CHÚ Ý ${w}\n`);
    process.stderr.write(`${r.ok ? 'Đạt' : 'Không đạt'}: ${JSON.stringify(r.counts)}\n`);
  }
  process.exitCode = r.ok ? 0 : 1;
}
