// IntakeStore trong bộ nhớ (DDD-01 §3.3) cho test và web worker tạm. FileIntakeStore (CLI, MOD-INT-14) ở phiếu engine new-game.
import type { IntakeSessionState, IntakeStore } from './types.js';

export class MemoryIntakeStore implements IntakeStore {
  private readonly map = new Map<string, string>();

  load(sessionId: string): Promise<IntakeSessionState | null> {
    const raw = this.map.get(sessionId);
    return Promise.resolve(raw === undefined ? null : (JSON.parse(raw) as IntakeSessionState));
  }

  /** Lưu bản sao JSON (không chia sẻ tham chiếu với nơi gọi), như ghi tệp/CSDL thật. */
  save(s: IntakeSessionState): Promise<void> {
    this.map.set(s.id, JSON.stringify(s));
    return Promise.resolve();
  }
}
