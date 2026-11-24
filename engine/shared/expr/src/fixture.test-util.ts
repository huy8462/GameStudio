// Ngữ cảnh và môi trường dùng chung cho test expr (TST-RTM-03). Không xuất ra API công khai.
import type { ExprContextSpec, ExprEnv, ExprValue } from './types.js';

export const SPEC: ExprContextSpec = {
  idents: {
    hour: 'number',
    'flag.cua_mo': 'bool',
    'flag.da_gap': 'bool',
    'counter.lua': 'number',
    'quest.trau.state': 'number',
    name: 'string',
    atk: 'number',
    def: 'number',
  },
  fns: {
    max: { args: 2, ret: 'number' },
    min: { args: 2, ret: 'number' },
    round: { args: 1, ret: 'number' },
    rand: { args: 0, ret: 'number' },
    event: { args: 1, ret: 'bool' },
  },
};

export const VALUES: Readonly<Record<string, ExprValue>> = {
  hour: 18,
  'flag.cua_mo': true,
  'flag.da_gap': false,
  'counter.lua': 5,
  'quest.trau.state': 2,
  name: 'ong_lao',
  atk: 12,
  def: 4,
};

/** Môi trường giả: đếm số lần gọi để kiểm ngắn mạch. */
export function makeEnv(overrides: Partial<Record<string, ExprValue>> = {}): ExprEnv & { calls: number } {
  const names = Object.keys(SPEC.idents);
  const vals = names.map((n) => (n in overrides ? overrides[n] : VALUES[n]) as ExprValue);
  const env = {
    calls: 0,
    ident: (slot: number): ExprValue => vals[slot] as ExprValue,
    call(fnSlot: number, a0: number, a1: number): number | boolean {
      env.calls++;
      switch (fnSlot) {
        case 0:
          return Math.max(a0, a1);
        case 1:
          return Math.min(a0, a1);
        case 2:
          return Math.round(a0);
        case 3:
          return 0.25;
        case 4:
          return a0 === 7;
        default:
          throw new Error(`slot hàm lạ ${fnSlot}`);
      }
    },
  };
  return env;
}
