// Giao diện mô hình (IF-INT-01, DDD-01 §3.1 MOD-INT-13). Theo ADR-035, engine không gọi API Claude: cài đặt là
// HandoffLlmClient (Claude Code đọc/ghi tệp), FakeLlmClient (test) và sau W1 ClaudeCodeCliClient qua cầu nối cục bộ.
// Không có trường khoá/token nào ở đây.
import type { Result } from '../result.js';

export type LlmTask = 'analyze' | 'clarify' | 'brief' | 'repair' | 'reverse_brief';

export type ContentPart =
  { type: 'text'; text: string } | { type: 'image'; name: string; mime: string; bytes: Uint8Array };

export interface Msg {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface LlmRequest {
  task: LlmTask;
  system: string;
  messages: Msg[];
  /** JSON Schema 2020-12 của `data` trả về. */
  outputSchema: object;
  maxOutputTokens: number;
  promptVersion: string;
  meta: { sessionId: string };
}

export interface LlmResult<T = unknown> {
  data: T;
  /** Ai trả lời: 'claude-code' (handoff), 'fake' (test). */
  answeredBy: string;
}

export interface LlmClient {
  complete<T = unknown>(req: LlmRequest): Promise<Result<LlmResult<T>>>;
}
