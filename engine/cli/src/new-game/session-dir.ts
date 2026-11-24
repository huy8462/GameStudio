// Thư mục phiên tạo game trên CLI (DDD-01 §3.3 v0.2, EP-INT-01): games/.intake/pending/<sid>/ khi chưa có game,
// games/<id>/.intake/<sid>/ sau xác nhận. Gồm input.json, input-images/*, rounds.json (các lượt trả lời theo thứ tự),
// session.json (FileIntakeStore), req-<n>.json / res-<n>.json + images/ (HandoffLlmClient), preview/ (bản xem trước).
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

import { sha256Hex } from '@gamestudio/schema';
import type { Answers, IntakeImage } from '@gamestudio/intake';

export interface SessionInput {
  schema: 'new-game-input/1';
  description: string;
  seed?: number;
  language: 'vi' | 'en';
  images: { name: string; mime: string }[];
}

export interface Round {
  answers: Answers;
  useDefaults: boolean;
}

export const pendingRoot = (gamesDir: string): string => join(gamesDir, '.intake', 'pending');

/** Id phiên tất định từ mô tả + seed (cùng mô tả → cùng phiên, chạy lại là làm tiếp). */
export const sessionIdFor = (description: string, seed?: number): string =>
  `s-${sha256Hex(`${description.normalize('NFC').trim()}|${seed ?? ''}`).slice(0, 16)}`;

/** Tìm thư mục phiên: pending trước, rồi games/<id>/.intake/<sid>. */
export function findSessionDir(gamesDir: string, sid: string): string | undefined {
  const p = join(pendingRoot(gamesDir), sid);
  if (existsSync(join(p, 'input.json'))) return p;
  if (!existsSync(gamesDir)) return undefined;
  for (const g of readdirSync(gamesDir).sort()) {
    const d = join(gamesDir, g, '.intake', sid);
    if (!g.startsWith('.') && existsSync(join(d, 'input.json'))) return d;
  }
  return undefined;
}

/** Id game đã có (để slug không trùng): thư mục con của games/ trừ thư mục ẩn và _template. */
export const existingGameIds = (gamesDir: string): string[] =>
  existsSync(gamesDir)
    ? readdirSync(gamesDir).filter(
        (n) => !n.startsWith('.') && !n.startsWith('_') && statSync(join(gamesDir, n)).isDirectory(),
      )
    : [];

export const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

export function writeAtomic(path: string, text: string | Uint8Array): void {
  mkdirSync(join(path, '..'), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

export function createSession(dir: string, input: SessionInput, images: readonly IntakeImage[]): void {
  mkdirSync(dir, { recursive: true });
  for (const img of images) writeAtomic(join(dir, 'input-images', img.name), img.bytes);
  writeAtomic(join(dir, 'input.json'), json(input));
  writeAtomic(join(dir, 'rounds.json'), json([]));
}

export function readSession(dir: string): { input: SessionInput; images: IntakeImage[]; rounds: Round[] } {
  const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf8')) as SessionInput;
  const images = input.images.map((i) => ({
    ...i,
    bytes: new Uint8Array(readFileSync(join(dir, 'input-images', i.name))),
  }));
  const rounds = JSON.parse(readFileSync(join(dir, 'rounds.json'), 'utf8')) as Round[];
  return { input, images, rounds };
}

export const appendRound = (dir: string, rounds: Round[], r: Round): void =>
  writeAtomic(join(dir, 'rounds.json'), json([...rounds, r]));

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
/** Mime theo đuôi tệp; đuôi lạ → mime lạ để intake bỏ ảnh kèm cảnh báo ERR-INT-02. */
export const mimeOf = (name: string): string => MIME[extname(name).toLowerCase()] ?? 'application/octet-stream';
