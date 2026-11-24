// TC-INT-12 (IF-INT-02, DTO-INT-09): HandoffLlmClient: thư mục rỗng → req-1 + HANDOFF_PENDING; res-1 sai schema →
// HANDOFF_INVALID; res-1 đúng → bước kế (req-2). Không có khoá API nào ở luồng này (ADR-035).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { analyze } from '../session.js';
import { MemoryIntakeStore } from '../store.js';
import { ANALYSIS_1, DESC_1, TEMPLATE } from '../test-fixtures.js';
import type { Deps } from '../types.js';
import { HANDOFF_SCHEMA, HandoffLlmClient } from './handoff.js';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Mỗi lần "chạy lệnh" tạo client mới (như CLI chạy lại), cùng thư mục handoff. */
const deps = (dir: string): Deps => ({
  llm: new HandoffLlmClient(dir),
  store: new MemoryIntakeStore(),
  clock: { now: () => Date.UTC(2026, 10, 24) },
  newId: () => 'phien-handoff',
  template: TEMPLATE,
});

const res = (dir: string, n: number, data: unknown): void =>
  writeFileSync(
    join(dir, `res-${n}.json`),
    JSON.stringify({ schema: HANDOFF_SCHEMA, n, data, answeredBy: 'claude-code', at: '2026-11-24T00:00:00Z' }),
  );

describe('HandoffLlmClient', () => {
  it('rỗng → req-1 (analyze) + HANDOFF_PENDING; res sai → HANDOFF_INVALID; res đúng → req-2 (clarify)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gs-handoff-'));
    dirs.push(dir);
    const img = { name: 'phac-thao.png', mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) };

    const r1 = await analyze({ description: DESC_1, images: [img] }, deps(dir));
    expect(!r1.ok && r1.error).toMatchObject({ code: 'HANDOFF_PENDING', detail: { n: 1, reqFile: 'req-1.json' } });
    const req1 = JSON.parse(readFileSync(join(dir, 'req-1.json'), 'utf8')) as Record<string, unknown>;
    expect(req1).toMatchObject({ schema: HANDOFF_SCHEMA, n: 1, task: 'analyze', promptVersion: 'analyze@1' });
    expect(JSON.stringify(req1['messages'])).toContain('"path":"images/phac-thao.png"');
    expect(existsSync(join(dir, 'images', 'phac-thao.png'))).toBe(true);
    expect(JSON.stringify(req1)).not.toMatch(/api[_-]?key|secret|authorization|bearer|sk-ant/i);

    res(dir, 1, { fields: { camera: { value: 'third_person' } } }); // thiếu status, evidence
    const r2 = await analyze({ description: DESC_1, images: [img] }, deps(dir));
    expect(!r2.ok && r2.error.code).toBe('HANDOFF_INVALID');
    expect(!r2.ok && r2.error.message).toMatch(/^res-1\.json sai outputSchema/);

    res(dir, 1, ANALYSIS_1);
    const r3 = await analyze({ description: DESC_1, images: [img] }, deps(dir));
    expect(!r3.ok && r3.error).toMatchObject({ code: 'HANDOFF_PENDING', detail: { n: 2 } });
    expect(JSON.parse(readFileSync(join(dir, 'req-2.json'), 'utf8'))).toMatchObject({ task: 'clarify', n: 2 });
  });

  it('res-<n> sai số thứ tự hoặc không phải JSON → HANDOFF_INVALID', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gs-handoff-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'res-1.json'), '{hỏng');
    expect(
      await new HandoffLlmClient(dir).complete({
        task: 'analyze',
        system: '',
        messages: [],
        outputSchema: {},
        maxOutputTokens: 1,
        promptVersion: 'x',
        meta: { sessionId: 's' },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'HANDOFF_INVALID' },
    });
    res(dir, 2, {});
    writeFileSync(join(dir, 'res-1.json'), JSON.stringify({ schema: HANDOFF_SCHEMA, n: 9, data: {} }));
    const r = await new HandoffLlmClient(dir).complete({
      task: 'analyze',
      system: '',
      messages: [],
      outputSchema: {},
      maxOutputTokens: 1,
      promptVersion: 'x',
      meta: { sessionId: 's' },
    });
    expect(!r.ok && r.error.message).toMatch(/n = 1/);
  });
});
