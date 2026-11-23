// Lệnh `engine doctor [--role dev|worker|ci] [--json]` (EP-DEV-05, IF-DEV-03, FR-DEV-20, 22).
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Command } from 'commander';
import { Option } from 'commander';

import { runDoctor } from '../doctor/run-doctor.js';
import type { Role } from '../doctor/types.js';
import { ROLES } from '../doctor/types.js';
import { printHuman, printJson } from '../output.js';

const here = dirname(fileURLToPath(import.meta.url));
/** dist/commands → ../.. = engine/cli; src/doctor/blender-probe.py luôn nằm cạnh mã nguồn. */
const PROBE = resolve(here, '..', '..', 'src', 'doctor', 'blender-probe.py');

/** Tìm tools/versions.json đi ngược lên từ thư mục hiện tại (gốc repo). */
export function findVersionsFile(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    const p = join(dir, 'tools', 'versions.json');
    if (existsSync(p)) return p;
    const up = dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

const ICON = { ok: 'OK  ', missing: 'THIẾU', mismatch: 'LỆCH' } as const;

export function registerDoctor(program: Command, setExit: (code: number) => void): void {
  program
    .command('doctor')
    .description('Kiểm môi trường: phiên bản công cụ, Blender + add-on, biến môi trường (chỉ báo có/không).')
    .addOption(new Option('--role <role>', 'vai trò máy').choices([...ROLES]).default('dev'))
    .option('--json', 'in báo cáo JSON một dòng ra stdout')
    .option('--versions <path>', 'đường dẫn versions.json (mặc định: tools/versions.json của repo)')
    .action(async (opts: { role: Role; json?: boolean; versions?: string }) => {
      const versionsPath = opts.versions ?? findVersionsFile(process.cwd());
      if (versionsPath === undefined) {
        printHuman('ERR-DEV-04 tools/versions.json: không tìm thấy (chạy trong repo GameStudio).');
        setExit(5);
        return;
      }
      const { report, exitCode } = await runDoctor({ role: opts.role, versionsPath, probePath: PROBE });
      if (opts.json === true) printJson(report);
      else {
        for (const c of report.checks) {
          const tag = c.status !== 'ok' && c.optional === true ? 'TÙY ' : ICON[c.status];
          printHuman(`${tag} ${c.message}`);
        }
        printHuman(
          report.ok ? `Doctor đạt (vai trò ${report.role}).` : `Doctor KHÔNG đạt (vai trò ${report.role}), mã thoát 5.`,
        );
      }
      setExit(exitCode);
    });
}
