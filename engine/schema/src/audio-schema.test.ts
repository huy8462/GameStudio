// T-0018 (SCH-AST-05, DTO-AST-05, ADR-037): sidecar audio/1 chỉ nhận files.aac; files.opus là lỗi.
import { describe, expect, it } from 'vitest';

import { validate } from './validate.js';

const good = {
  schema: 'audio/1',
  id: 'amb-rung',
  kind: 'ambience',
  loop: true,
  loopPoints: { startS: 0.1, endS: 12.05 },
  lufs: -16,
  durationS: 12.15,
  files: { aac: 'amb-rung.m4a' },
  tags: ['rung'],
};

describe('audio/1', () => {
  it('sidecar hợp lệ', () => {
    expect(validate('audio', good)).toEqual([]);
    expect(validate('audio', { ...good, kind: 'sfx', loop: false, loopPoints: undefined, surface: 'co' })).toEqual([]);
  });

  it('files.opus (đường cũ ADR-024) bị bắt, kể cả khi có aac', () => {
    expect(
      validate('audio', { ...good, files: { aac: 'amb-rung.m4a', opus: 'amb-rung.webm' } }).length,
    ).toBeGreaterThan(0);
    expect(validate('audio', { ...good, files: { opus: 'amb-rung.webm' } }).length).toBeGreaterThan(0);
  });

  it('đuôi không phải .m4a, lufs khác −16, lặp mà thiếu loopPoints → lỗi', () => {
    expect(validate('audio', { ...good, files: { aac: 'amb-rung.ogg' } }).length).toBeGreaterThan(0);
    expect(validate('audio', { ...good, lufs: -14 }).length).toBeGreaterThan(0);
    const { loopPoints: _drop, ...noLoop } = good;
    expect(validate('audio', noLoop).length).toBeGreaterThan(0);
  });
});
