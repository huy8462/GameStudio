#!/usr/bin/env node
// Điểm vào lệnh `engine` (MOD-CLI-01, IF-CLI-01). Có: doctor (E0), validate (E1 T-0002), build (E1 T-0005), new-game (E1 T-0013), status + build --stale (E1 T-0014), import + brief (E1 T-0016).
import { Command } from 'commander';

import { registerBrief } from './commands/brief.js';
import { registerBuild } from './commands/build.js';
import { registerDoctor } from './commands/doctor.js';
import { registerImport } from './commands/import.js';
import { registerNewGame } from './commands/new-game.js';
import { registerStatus } from './commands/status.js';
import { registerValidate } from './commands/validate.js';
import { EXIT } from './exit-codes.js';

let exitCode: number = EXIT.OK;
const program = new Command().name('engine').description('CLI GameStudio (SRS-04 FR-CLI-01).').version('0.0.0');
const setExit = (code: number): void => {
  exitCode = code;
};

registerDoctor(program, setExit);
registerValidate(program, setExit);
registerBuild(program, setExit);
registerNewGame(program, setExit);
registerStatus(program, setExit);
registerImport(program, setExit);
registerBrief(program, setExit);

try {
  await program.parseAsync(process.argv);
  process.exitCode = exitCode;
} catch (err) {
  process.stderr.write(`[gs] lỗi không mong đợi: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = EXIT.UNCAUGHT;
}
