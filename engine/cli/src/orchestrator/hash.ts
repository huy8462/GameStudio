// Băm bước build (ALG-GEN-02, DDD-00 PSC-GEN-02): inputHash theo lát dữ liệu, tệp, upstream, zone, tier, seed; outputHash.
import { createHash } from 'node:crypto';
import { globSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { canonicalize, formatPointer, parsePointer, sha256Hex } from '@gamestudio/schema';

import type { StepDef, StepId, Tier } from './types.js';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Giải JSON Pointer có '*' (mọi phần tử mảng hoặc khoá object). Trả cặp (con trỏ cụ thể, giá trị) đã sắp. */
export function resolvePointer(data: unknown, ptr: string): [string, unknown][] {
  let cur: [string[], unknown][] = [[[], data]];
  for (const tok of parsePointer(ptr)) {
    const next: [string[], unknown][] = [];
    for (const [path, v] of cur) {
      if (tok === '*') {
        if (Array.isArray(v)) v.forEach((x, i) => next.push([[...path, String(i)], x]));
        else if (isObj(v)) for (const k of Object.keys(v).sort()) next.push([[...path, k], v[k]]);
      } else if (Array.isArray(v) && /^(0|[1-9]\d*)$/.test(tok) && Number(tok) < v.length) {
        next.push([[...path, tok], v[Number(tok)]]);
      } else if (isObj(v) && Object.hasOwn(v, tok)) {
        next.push([[...path, tok], v[tok]]);
      }
    }
    cur = next;
  }
  return cur.map(([p, v]): [string, unknown] => [formatPointer(p), v]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Trích lát dữ liệu cho ctx.inputs.data: {con trỏ cụ thể: giá trị}. */
export function extractData(data: unknown, pointers: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ptr of [...pointers].sort()) for (const [p, v] of resolvePointer(data, ptr)) out[p] = v;
  return out;
}

export function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Tệp khớp glob (tương đối gameDir, dùng '/'), đã sắp, bỏ trùng. */
export function matchFiles(gameDir: string, globs: readonly string[]): string[] {
  const set = new Set<string>();
  for (const g of globs) {
    for (const f of globSync(g, { cwd: gameDir })) {
      if (statSync(join(gameDir, f)).isFile()) set.add(f.replace(/\\/g, '/'));
    }
  }
  return [...set].sort();
}

export interface HashInput {
  data: unknown;
  gameDir: string;
  upstream: Readonly<Record<StepId, { outputHash: string }>>;
  zone: string | null;
  tier: Tier | null;
  seed: number;
  toolVersions: Readonly<Record<string, string>>;
}

export function inputHash(step: StepDef, h: HashInput): string {
  const dataSlices: Record<string, string> = {};
  for (const [p, v] of Object.entries(extractData(h.data, step.inputs.dataPointers))) {
    dataSlices[p] = sha256Hex(canonicalize(v));
  }
  const files: Record<string, string> = {};
  for (const f of matchFiles(h.gameDir, step.inputs.files)) files[f] = fileHash(join(h.gameDir, f));
  const upstream: Record<string, string> = {};
  for (const s of [...step.deps].sort()) upstream[s] = h.upstream[s]?.outputHash ?? 'missing';
  const toolVersions = [...(step.tools ?? [])].sort().map((t) => `${t}@${h.toolVersions[t] ?? 'unknown'}`);
  const body = {
    step: step.id,
    stepVersion: step.version,
    toolVersions,
    dataSlices,
    files,
    params: step.inputs.params,
    upstream,
    zone: h.zone,
    tier: h.tier,
    seed: h.seed,
  };
  return `sha256:${sha256Hex(canonicalize(body))}`;
}

function walk(dir: string, root: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, root, out);
    else out.push(relative(root, p).replace(/\\/g, '/'));
  }
}

/** outputHash(outDir): mọi tệp trừ report.json ở gốc, sắp theo đường dẫn (PSC-GEN-02). */
export function outputHash(outDir: string): { hash: string; files: string[] } {
  const files: string[] = [];
  walk(outDir, outDir, files);
  const kept = files.filter((f) => f !== 'report.json').sort();
  const lines = kept.map((f) => `${f} ${fileHash(join(outDir, f))}`);
  return { hash: `sha256:${sha256Hex(lines.join('\n'))}`, files: kept };
}
