// FileIntakeStore (MOD-INT-14, DDD-01 §3.3): một thư mục mỗi phiên, session.json ghi nguyên tử (tệp tạm + rename).
// Chỉ Node; xuất qua '@gamestudio/intake/node'. Nơi gọi (engine new-game) quyết định thư mục phiên.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IntakeSessionState, IntakeStore } from './types.js';

export class FileIntakeStore implements IntakeStore {
  /** dirOf(sessionId) → thư mục phiên (vd games/.intake/pending/<id> hoặc games/<game>/.intake/<id>). */
  constructor(private readonly dirOf: (sessionId: string) => string) {}

  load(sessionId: string): Promise<IntakeSessionState | null> {
    const p = join(this.dirOf(sessionId), 'session.json');
    if (!existsSync(p)) return Promise.resolve(null);
    return Promise.resolve(JSON.parse(readFileSync(p, 'utf8')) as IntakeSessionState);
  }

  save(s: IntakeSessionState): Promise<void> {
    const dir = this.dirOf(s.id);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, 'session.json.tmp');
    writeFileSync(tmp, `${JSON.stringify(s, null, 2)}\n`);
    renameSync(tmp, join(dir, 'session.json'));
    return Promise.resolve();
  }
}
