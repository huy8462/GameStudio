// FakeLlmClient (MOD-INT-21): trả đáp án ghi sẵn theo task, theo thứ tự; ghi lại yêu cầu để test so khớp.
// Khác DDD: đáp án truyền trong bộ nhớ thay vì đọc fixtures/<case>/<task>-<n>.json (thư viện không đọc tệp).
import type { Result } from '../types.js';
import { err } from '../types.js';
import type { LlmClient, LlmRequest, LlmResult, LlmTask } from './types.js';

export class FakeLlmClient implements LlmClient {
  readonly requests: LlmRequest[] = [];
  private readonly used = new Map<LlmTask, number>();

  constructor(private readonly answers: Partial<Record<LlmTask, unknown[]>>) {}

  complete<T = unknown>(req: LlmRequest): Promise<Result<LlmResult<T>>> {
    this.requests.push(req);
    const i = this.used.get(req.task) ?? 0;
    this.used.set(req.task, i + 1);
    const list = this.answers[req.task] ?? [];
    if (i >= list.length) {
      return Promise.resolve(err('ERR-INT-04', `FakeLlmClient: hết đáp án cho task '${req.task}' (lần ${i + 1})`));
    }
    return Promise.resolve({ ok: true, value: { data: list[i] as T, answeredBy: 'fake' } });
  }

  /** Số lời gọi theo task (TC-INT-16: mở lại phiên không gọi mô hình). */
  count(task?: LlmTask): number {
    return task === undefined ? this.requests.length : this.requests.filter((r) => r.task === task).length;
  }
}
