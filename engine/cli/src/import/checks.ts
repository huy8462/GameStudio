// Kiểm game nhập → import/1 (MOD-CLI-09 checks, PSC-CLI-07, ALG-CLI-07, SCH-RTM-10, DTO-CLI-06; FR-CLI-11).
// Chỉ ĐỌC: parse JSON trong data/, kiểm cấu trúc SRS-04 §6.1, đuôi tệp cho phép, schema, engineVersion, provenance.
// Không chạy mã nào của game nhập (scripts/ chỉ được chép). Có vấn đề → result 'chan' (ERR-CLI-03, thoát 4, không ghi gì).
import { validateFiles } from '@gamestudio/schema';

import type { ReverseReport } from '../brief/run-reverse.js';
import { engineSatisfies } from '../build-cmd/guards.js';
import type { GameDataFiles } from '../orchestrator/game-data.js';
import type { Problem, SourceFile } from './unpack.js';

export interface ImportReport {
  schema: 'import/1';
  result: 'ok' | 'canNangCap' | 'chan';
  gameId: string | null;
  engineVersion: string | null;
  schemaVersion: number | null;
  hasBrief: boolean;
  counts: { zones: number; npcs: number; animals: number; assets: number };
  assets: { missingProvenance: string[]; pendingReview: string[] };
  problems: Problem[];
  migrateFrom?: number;
  /** Bổ sung ngoài SCH-RTM-10: kết quả suy brief nháp (PSC-INT-13). */
  brief?: Omit<ReverseReport, 'warnings'>;
}

export interface CheckOptions {
  into?: string;
  engineVersion: string;
  /** Id game đã có trong games/. */
  existingIds: readonly string[];
}

/** Schema dữ liệu engine hiện đọc (SCH-GEN-01…03 bản 1). */
export const SCHEMA_VERSION = 1;
const TOP_DIRS = new Set(['data', 'assets', 'scripts', 'qa', 'brief']);
const TOP_FILES = /^(game-brief\.md|style-bible\.md|handoff\.md|README\.md|\.gitignore)$/;
const EXT_OK = /\.(json|md|txt|glb|gltf|bin|png|jpe?g|webp|ktx2|hdr|ogg|mp3|wav|m4a|csv)$/i;
const SCRIPT_EXT = /\.(ts|js|mjs)$/i;
const MAX_SCHEMA_PROBLEMS = 20;

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export function checkImport(
  files: ReadonlyMap<string, SourceFile>,
  o: CheckOptions,
): { report: ImportReport; data: GameDataFiles } {
  const problems: Problem[] = [];
  const add = (code: string, path: string, message: string): void => void problems.push({ code, path, message });
  const keys = [...files.keys()].sort();
  const hasBrief = keys.some((k) => /^brief\/v[1-9]\d*\/brief\.json$/.test(k));

  // Cấu trúc + đuôi tệp.
  for (const k of keys) {
    const top = k.split('/')[0] ?? '';
    if (!k.includes('/')) {
      if (!TOP_FILES.test(k)) add('ERR-CLI-03', k, 'Tệp ngoài cấu trúc games/<id>/ (SRS-04 §6.1).');
      continue;
    }
    if (!TOP_DIRS.has(top)) add('ERR-CLI-03', k, `Thư mục '${top}/' ngoài cấu trúc games/<id>/.`);
    else if (top === 'scripts' ? !SCRIPT_EXT.test(k) && !EXT_OK.test(k) : !EXT_OK.test(k))
      add('ERR-CLI-03', k, 'Đuôi tệp không được phép.');
  }

  // data/**/*.json.
  const data: GameDataFiles = {};
  for (const k of keys.filter((x) => x.startsWith('data/') && x.endsWith('.json'))) {
    try {
      data[k.slice('data/'.length)] = JSON.parse(files.get(k)?.read().toString('utf8') ?? '') as unknown;
    } catch (e) {
      add('ERR-CLI-03', k, `JSON hỏng: ${(e as Error).message}`);
    }
  }
  const game = obj(data['game.json']);
  if (data['game.json'] === undefined) add('ERR-CLI-03', 'data/game.json', 'Thiếu data/game.json.');
  if (data['world.json'] === undefined)
    add(hasBrief ? 'ERR-CLI-03' : 'ERR-INT-09', 'data/world.json', 'Thiếu data/world.json: không đủ dữ liệu.');
  const gameId = typeof game['id'] === 'string' ? game['id'] : null;
  const engineVersion = typeof game['engineVersion'] === 'string' ? game['engineVersion'] : null;
  const schemaVersion = typeof game['schemaVersion'] === 'number' ? game['schemaVersion'] : null;

  if (data['game.json'] !== undefined) {
    if (o.into !== undefined && gameId !== o.into)
      add('ERR-CLI-03', 'data/game.json#/id', `gameId '${gameId ?? '?'}' không khớp --into '${o.into}'.`);
    if (schemaVersion !== null && schemaVersion > SCHEMA_VERSION)
      add(
        'ERR-CLI-03',
        'data/game.json#/schemaVersion',
        `schemaVersion ${schemaVersion} mới hơn engine (${SCHEMA_VERSION}).`,
      );
    const report = validateFiles(Object.fromEntries(Object.entries(data).map(([k, v]) => [`data/${k}`, v])));
    const errs = Object.entries(report).flatMap(([f, es]) => es.map((e) => ({ f, e })));
    for (const { f, e } of errs.slice(0, MAX_SCHEMA_PROBLEMS))
      add('ERR-RTM-03', `${f}${e.instancePath === '/' ? '' : `#${e.instancePath}`}`, e.message);
    if (engineVersion === null || !engineSatisfies(engineVersion, o.engineVersion))
      add(
        'ERR-RTM-04',
        'data/game.json#/engineVersion',
        `Game cần engine ^${engineVersion ?? '?'}, hiện có ${o.engineVersion}.`,
      );
    if (gameId !== null) {
      const exists = o.existingIds.includes(gameId);
      if (exists && o.into === undefined)
        add('ERR-CLI-03', `games/${gameId}`, `Đã có game '${gameId}': dùng --into ${gameId} để cập nhật.`);
      if (!exists && o.into !== undefined) add('ERR-CLI-03', `games/${o.into}`, `Chưa có game '${o.into}' để --into.`);
    }
  }

  // Asset + provenance (SRS-04 §6.1: mỗi tệp kèm <tệp>.provenance.json; thiếu → chờ duyệt, không chặn).
  const assets = keys.filter((k) => k.startsWith('assets/') && !k.endsWith('.provenance.json'));
  const missing = assets.filter((a) => !files.has(`${a}.provenance.json`));
  const count = (dir: string): number => Object.keys(data).filter((k) => k.startsWith(`entities/${dir}/`)).length;
  const zones = obj(data['world.json'])['zones'];
  return {
    data,
    report: {
      schema: 'import/1',
      result: problems.length > 0 ? 'chan' : 'ok',
      gameId,
      engineVersion,
      schemaVersion,
      hasBrief,
      counts: {
        zones: Array.isArray(zones) ? zones.length : 0,
        npcs: count('npc'),
        animals: count('animals'),
        assets: assets.length,
      },
      assets: { missingProvenance: missing, pendingReview: missing },
      problems,
    },
  };
}
