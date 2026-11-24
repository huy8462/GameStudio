// HandoffLlmClient (MOD-INT-19, IF-INT-02, DTO-INT-09, EP-INT-02). Chỉ dùng trên Node (xuất qua '@gamestudio/intake/node').
// Lời gọi thứ k của một lần chạy: có res-<k>.json hợp lệ outputSchema → trả data; chưa có → ghi req-<k>.json và trả
// HANDOFF_PENDING {n: k}. Phiên Claude Code (skill engine-intake) đọc req, viết res, chạy lại lệnh. Không cần khoá API:
// chi phí tính vào phiên Claude Code của người dùng (ADR-002, ADR-035).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Result } from '../types.js';
import { err } from '../types.js';
import { validateOutput } from '../schemas/index.js';
import type { ContentPart, LlmClient, LlmRequest, LlmResult } from './types.js';

export const HANDOFF_SCHEMA = 'intake-handoff/1';

function writeAtomic(path: string, text: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

export class HandoffLlmClient implements LlmClient {
  private n = 0;

  /** dir = games/<id>/.intake/<sessionId> (hoặc thư mục chờ khi chưa có game). */
  constructor(private readonly dir: string) {}

  /** Ảnh thay bằng đường dẫn tương đối images/<tên> (DTO-INT-09); bytes ghi một lần. */
  private serialize(req: LlmRequest): object {
    const messages = req.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content.map((p: ContentPart) => {
              if (p.type === 'text') return p;
              const rel = `images/${p.name}`;
              const abs = join(this.dir, rel);
              if (!existsSync(abs)) {
                mkdirSync(join(this.dir, 'images'), { recursive: true });
                writeFileSync(abs, p.bytes);
              }
              return { type: 'image', mime: p.mime, path: rel };
            }),
    }));
    return {
      schema: HANDOFF_SCHEMA,
      task: req.task,
      system: req.system,
      messages,
      outputSchema: req.outputSchema,
      maxOutputTokens: req.maxOutputTokens,
      promptVersion: req.promptVersion,
    };
  }

  complete<T = unknown>(req: LlmRequest): Promise<Result<LlmResult<T>>> {
    const k = ++this.n;
    mkdirSync(this.dir, { recursive: true });
    const resPath = join(this.dir, `res-${k}.json`);
    if (existsSync(resPath)) {
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(resPath, 'utf8'));
      } catch (e) {
        return Promise.resolve(
          err('HANDOFF_INVALID', `res-${k}.json không phải JSON: ${(e as Error).message}`, { n: k }),
        );
      }
      const r = raw as { schema?: unknown; n?: unknown; data?: unknown };
      if (r.schema !== HANDOFF_SCHEMA || r.n !== k) {
        return Promise.resolve(
          err('HANDOFF_INVALID', `res-${k}.json cần schema '${HANDOFF_SCHEMA}' và n = ${k}`, { n: k }),
        );
      }
      const errors = validateOutput(req.outputSchema, r.data);
      if (errors.length > 0) {
        const msg = errors.map((e) => `${e.instancePath} ${e.message}`).join('; ');
        return Promise.resolve(err('HANDOFF_INVALID', `res-${k}.json sai outputSchema: ${msg}`, { n: k, errors }));
      }
      return Promise.resolve({ ok: true, value: { data: r.data as T, answeredBy: 'claude-code' } });
    }
    const reqPath = join(this.dir, `req-${k}.json`);
    writeAtomic(reqPath, `${JSON.stringify({ ...this.serialize(req), n: k }, null, 2)}\n`);
    return Promise.resolve(
      err('HANDOFF_PENDING', `Chờ Claude Code trả lời req-${k}.json (viết res-${k}.json rồi chạy lại)`, {
        n: k,
        reqFile: `req-${k}.json`,
      }),
    );
  }
}
