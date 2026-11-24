// Lệnh `engine validate [--all | --staged | <tệp…>] [--schema <tệp>] [--json]` (TC-GEN-01, EP-DEV-06, EP-INT-02).
// Thoát 0 khi hợp lệ, 4 khi có lỗi dữ liệu (DDD-00 §5.2, ERR-RTM-03) hoặc sai tham số (ERR-CLI-01).
import { dirname } from 'node:path';

import type { Command } from 'commander';

import { EXIT } from '../exit-codes.js';
import { printHuman, printJson } from '../output.js';
import {
  exitOf,
  listAll,
  listStaged,
  resolveAll,
  validatePaths,
  validateWithSchema,
  type ValidateReport,
} from '../validate/run-validate.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  all?: boolean;
  staged?: boolean;
  schema?: string;
  json?: boolean;
}

/** Gốc repo = thư mục chứa tools/versions.json; không có thì dùng thư mục hiện tại. */
function repoRoot(cwd: string): string {
  const v = findVersionsFile(cwd);
  return v === undefined ? cwd : dirname(dirname(v));
}

function printReport(r: ValidateReport): void {
  for (const f of r.files) {
    if (f.errors.length === 0) continue;
    for (const e of f.errors) printHuman(`LỖI ${f.path}${e.instancePath === '/' ? '' : e.instancePath}: ${e.message}`);
  }
  const bad = r.files.filter((f) => f.errors.length > 0).length;
  printHuman(
    r.ok
      ? `Hợp lệ: ${r.checked} tệp có schema${r.skipped > 0 ? `, ${r.skipped} tệp chưa có schema (chỉ kiểm JSON)` : ''}.`
      : `Sai: ${bad}/${r.checked} tệp, mã thoát 4.`,
  );
}

export function registerValidate(program: Command, setExit: (code: number) => void): void {
  program
    .command('validate')
    .description('Kiểm dữ liệu game theo JSON Schema (games/*/data/**).')
    .argument('[files...]', 'tệp cần kiểm')
    .option('--all', 'mọi tệp games/*/data/**/*.json')
    .option('--staged', 'tệp dữ liệu game đã git add (pre-commit)')
    .option('--schema <path>', 'kiểm [files...] theo tệp JSON Schema này (handoff intake)')
    .option('--json', 'in báo cáo validate/1 một dòng ra stdout')
    .action((files: string[], opts: Opts) => {
      const cwd = process.cwd();
      const modes = [opts.all === true, opts.staged === true, files.length > 0].filter(Boolean).length;
      if (modes !== 1 || (opts.schema !== undefined && files.length === 0)) {
        printHuman('ERR-CLI-01 Dùng đúng một trong: --all, --staged, <tệp…>. --schema cần kèm <tệp…>.');
        setExit(EXIT.DATA);
        return;
      }
      const root = repoRoot(cwd);
      let report: ValidateReport;
      if (opts.schema !== undefined)
        report = validateWithSchema(root, resolveAll(cwd, [opts.schema])[0] ?? '', resolveAll(cwd, files));
      else if (opts.all === true) report = validatePaths(root, listAll(root));
      else if (opts.staged === true) report = validatePaths(root, listStaged(root));
      else report = validatePaths(root, resolveAll(cwd, files));
      if (opts.json === true) printJson(report);
      else printReport(report);
      setExit(exitOf(report));
    });
}
