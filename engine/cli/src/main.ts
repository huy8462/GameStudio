#!/usr/bin/env node
// Điểm vào lệnh `engine` (MOD-CLI-01, IF-CLI-01). E0: chỉ có `doctor`; các lệnh khác thêm từ E1.
import { Command } from 'commander';

import { registerDoctor } from './commands/doctor.js';
import { EXIT } from './exit-codes.js';

let exitCode: number = EXIT.OK;
const program = new Command().name('engine').description('CLI GameStudio (SRS-04 FR-CLI-01).').version('0.0.0');

registerDoctor(program, (code) => {
  exitCode = code;
});

try {
  await program.parseAsync(process.argv);
  process.exitCode = exitCode;
} catch (err) {
  process.stderr.write(`[gs] lỗi không mong đợi: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = EXIT.UNCAUGHT;
}
