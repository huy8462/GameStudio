// Fixture dùng chung cho test doctor (không chạy công cụ thật).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ExecResult, Runner } from './exec.js';
import { runDoctor } from './run-doctor.js';
import type { Role } from './types.js';

export const SHA_A = 'a'.repeat(64);
export const SHA_B = 'b'.repeat(64);
export const CANARY = 'sk-ant-api03-CANARY-0123456789abcdefghijklmnop';

export const VERSIONS = {
  node: { version: '24.21.0', match: 'minor', check: ['node', '--version'], parse: 'v(\\d+\\.\\d+\\.\\d+)' },
  blender: { version: '5.2.4', match: 'minor', check: ['blender'], probe: 'blender' },
  ffmpeg: {
    version: '9.0.2',
    match: 'minor',
    check: ['ffmpeg', '-version'],
    parse: 'ffmpeg version n(\\d+\\.\\d+\\.\\d+)',
    features: [{ id: 'libopus', check: ['ffmpeg', '-encoders'], expect: 'libopus' }],
  },
  claudeCode: {
    version: '2.1.0',
    match: 'minor',
    check: ['claude', '--version'],
    parse: '^(\\d+\\.\\d+\\.\\d+)',
    optional: true,
  },
  addons: { sapling: { module: 'bl_ext.blender_org.sapling_tree_gen', version: '1.2.0', sha256: SHA_A } },
};

export type Answers = Record<string, ExecResult>;
export const ok = (output: string): ExecResult => ({ found: true, code: 0, output, timedOut: false });
export const absent: ExecResult = { found: false, code: null, output: '', timedOut: false };

export function probeOut(addon: { version: string; sha256: string } | null, blender = '5.2.4'): ExecResult {
  const module = 'bl_ext.blender_org.sapling_tree_gen';
  const addons = addon === null ? [{ module, found: false }] : [{ module, found: true, loadable: true, ...addon }];
  return ok(`Blender ${blender}\nGSPROBE ${JSON.stringify({ version: blender, addons })}\nBlender quit`);
}

/** Tra câu trả lời theo 2 phần tử đầu của argv, rồi theo tên chương trình. */
export function fakeRunner(answers: Answers): Runner {
  return (argv) => Promise.resolve(answers[argv.slice(0, 2).join(' ')] ?? answers[argv[0] ?? ''] ?? absent);
}

export const GOOD: Answers = {
  'node --version': ok('v24.21.0'),
  blender: probeOut({ version: '1.2.0', sha256: SHA_A }),
  'ffmpeg -version': ok('ffmpeg version n9.0.2-62 Copyright'),
  'ffmpeg -encoders': ok(' A....D libopus  libopus Opus'),
  'claude --version': ok('2.1.319 (Claude Code)'),
};

export function writeVersions(obj: unknown = VERSIONS): string {
  const p = join(mkdtempSync(join(tmpdir(), 'gs-doctor-')), 'versions.json');
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

export function doctor(answers: Answers, env: NodeJS.ProcessEnv = {}, role: Role = 'dev') {
  return runDoctor({ role, versionsPath: writeVersions(), probePath: 'probe.py', env, run: fakeRunner(answers) });
}
