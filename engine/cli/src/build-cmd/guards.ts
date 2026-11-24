// Kiểm trước build (IF-CLI-01, MOD-CLI-02 guards; PSC-CLI-01 `guards(o)`): brief đã xác nhận (ERR-INT-06 → 3),
// dữ liệu đúng schema (ERR-RTM-03 → 4), engineVersion khớp (ERR-RTM-04, FR-RTM-03 → 4). Style bible: phiếu sau.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { validateFiles } from '@gamestudio/schema';

import { EXIT } from '../exit-codes.js';
import type { GameDataFiles } from '../orchestrator/game-data.js';

export interface GuardFail {
  exit: number;
  code: 'ERR-INT-06' | 'ERR-RTM-03' | 'ERR-RTM-04';
  message: string;
}

const HASH_RE = /^sha256:[0-9a-f]{64}\s*$/;

/** Trạng thái brief trên CLI: brief/v<n>/ bản lớn nhất; có hash.txt hợp lệ = DaXacNhan, không có = ChoXacNhan (DDD-01 §4, PSC-INT-09). */
export function briefStatus(gameDir: string): { status: 'KhongCo' | 'ChoXacNhan' | 'DaXacNhan'; version?: number } {
  const dir = join(gameDir, 'brief');
  if (!existsSync(dir)) return { status: 'KhongCo' };
  const versions = readdirSync(dir)
    .map((n) => /^v([1-9]\d*)$/.exec(n))
    .filter((m): m is RegExpExecArray => m !== null && statSync(join(dir, m[0])).isDirectory())
    .map((m) => Number(m[1]));
  if (versions.length === 0) return { status: 'KhongCo' };
  const v = Math.max(...versions);
  const hashFile = join(dir, `v${v}`, 'hash.txt');
  const ok = existsSync(hashFile) && HASH_RE.test(readFileSync(hashFile, 'utf8'));
  return { status: ok ? 'DaXacNhan' : 'ChoXacNhan', version: v };
}

export function checkBrief(gameDir: string): GuardFail | undefined {
  const b = briefStatus(gameDir);
  if (b.status === 'DaXacNhan') return undefined;
  const why = b.status === 'KhongCo' ? 'chưa có brief' : `brief v${b.version ?? '?'} đang chờ xác nhận`;
  return {
    exit: EXIT.NEEDS_CONFIRM,
    code: 'ERR-INT-06',
    message: `Không build được: ${why}. Xác nhận brief trước (engine new-game --confirm, engine brief confirm --game <id> hoặc Web Studio).`,
  };
}

export function checkData(data: GameDataFiles): GuardFail | undefined {
  const files: Record<string, unknown> = {};
  for (const [rel, v] of Object.entries(data)) files[`data/${rel}`] = v;
  const bad = Object.entries(validateFiles(files)).filter(([, errs]) => errs.length > 0);
  if (bad.length === 0) return undefined;
  const lines = bad.flatMap(([p, errs]) =>
    errs.slice(0, 3).map((e) => `${p}${e.instancePath === '/' ? '' : e.instancePath}: ${e.message}`),
  );
  return {
    exit: EXIT.DATA,
    code: 'ERR-RTM-03',
    message: `Dữ liệu sai schema (engine validate --all để xem đủ): ${lines.join('; ')}`,
  };
}

const parse = (v: string): [number, number, number] | undefined => {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
};

/** Khớp kiểu caret của semver: cùng major (0.x: cùng minor; 0.0.x: cùng patch) và engine ≥ bản game cần. */
export function engineSatisfies(required: string, current: string): boolean {
  const r = parse(required);
  const c = parse(current);
  if (!r || !c) return false;
  if (r[0] !== c[0]) return false;
  if (r[0] === 0 && r[1] !== c[1]) return false;
  if (r[0] === 0 && r[1] === 0 && r[2] !== c[2]) return false;
  for (let i = 0; i < 3; i++) if ((c[i] as number) !== (r[i] as number)) return (c[i] as number) > (r[i] as number);
  return true;
}

export function checkEngineVersion(data: GameDataFiles, current: string): GuardFail | undefined {
  const game = data['game.json'];
  const req =
    typeof game === 'object' && game !== null ? (game as Record<string, unknown>)['engineVersion'] : undefined;
  if (typeof req === 'string' && engineSatisfies(req, current)) return undefined;
  return {
    exit: EXIT.DATA,
    code: 'ERR-RTM-04',
    message: `Bản game cần engine ^${typeof req === 'string' ? req : '?'}, hiện có ${current}.`,
  };
}

/** Thứ tự: brief (3) → schema (4) → engineVersion (4); trả lỗi đầu tiên. */
export function runGuards(gameDir: string, data: GameDataFiles, engineVersion: string): GuardFail | undefined {
  return checkBrief(gameDir) ?? checkData(data) ?? checkEngineVersion(data, engineVersion);
}
