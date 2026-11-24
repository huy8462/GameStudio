// Gọi mô hình qua LlmClient tiêm vào và kiểm lại `data` theo outputSchema cho MỌI cài đặt (IF-INT-01; PSC-INT-04 tiền đề).
import { PROMPTS } from '../prompts.js';
import { MAX_OUTPUT_TOKENS } from '../config.js';
import { validateOutput } from '../schemas/index.js';
import type { Deps, Result } from '../types.js';
import { err } from '../types.js';
import type { LlmTask, Msg } from './types.js';

export async function callModel<T>(
  deps: Pick<Deps, 'llm'>,
  task: LlmTask,
  messages: Msg[],
  outputSchema: object,
  sessionId: string,
): Promise<Result<T>> {
  const p = PROMPTS[task];
  const r = await deps.llm.complete<T>({
    task,
    system: p.text,
    messages,
    outputSchema,
    maxOutputTokens: MAX_OUTPUT_TOKENS[task],
    promptVersion: p.version,
    meta: { sessionId },
  });
  if (!r.ok) return r;
  const errors = validateOutput(outputSchema, r.value.data);
  if (errors.length > 0) {
    // Handoff đã kiểm trước khi trả; tới đây là cài đặt khác trả sai schema.
    return err('ERR-INT-05', `Mô hình (${task}) trả dữ liệu sai schema`, { errors });
  }
  return { ok: true, value: r.value.data };
}
