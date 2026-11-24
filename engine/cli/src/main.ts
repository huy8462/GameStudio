#!/usr/bin/env node
// Điểm vào lệnh `engine` (MOD-CLI-01, IF-CLI-01). Có: doctor (E0), validate (E1 T-0002).
import { Command } from 'commander';

import { registerDoctor } from './commands/doctor.js';
import { registerValidate } from './commands/validate.js';
import { EXIT } from './exit-codes.js';

let exitCode: number = EXIT.OK;
const program = new Command().name('engine').description('CLI GameStudio (SRS-04 FR-CLI-01).').version('0.0.0');
const setExit = (code: number): void => {
  exitCode = code;
};

registerDoctor(program, setExit);
registerValidate(program, setExit);

try {
  await program.parseAsync(process.argv);
  process.exitCode = exitCode;
} catch (err) {
  process.stderr.write(`[gs] lỗi không mong đợi: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = EXIT.UNCAUGHT;
}
