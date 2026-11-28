// TST-DEV-03 / TC-DEV-03; TST-CLI-02 / TC-CLI-02 (doctor lỗi → 5); AC-09-06 (không in khoá).
import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runDoctor } from './run-doctor.js';
import {
  CANARY,
  GOOD,
  SHA_A,
  SHA_B,
  VERSIONS,
  absent,
  doctor,
  fakeRunner,
  ok,
  probeOut,
  writeVersions,
} from './test-fixtures.js';
import { parseVersionsFile, versionMatches } from './versions.js';

describe('engine doctor', () => {
  it('đủ công cụ → ok, mã thoát 0; khoá tuỳ chọn thiếu không làm hỏng', async () => {
    const { report, exitCode } = await doctor(GOOD);
    expect(exitCode).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.checks.find((c) => c.id === 'env.GEMINI_API_KEY')).toMatchObject({
      status: 'missing',
      optional: true,
    });
  });

  it('thiếu Blender → ERR-DEV-04 cho blender và add-on, mã thoát 5', async () => {
    const { report, exitCode } = await doctor({ ...GOOD, blender: absent });
    expect(exitCode).toBe(5);
    const b = report.checks.find((c) => c.id === 'blender');
    expect(b).toMatchObject({ status: 'missing', kind: 'version' });
    expect(b?.message).toBe('ERR-DEV-04 blender: cần 5.2.x, đang có không tìm thấy.');
    expect(report.checks.find((c) => c.id === 'addons.sapling')?.status).toBe('missing');
  });

  it('add-on lệch phiên bản và sha256 → mismatch, mã thoát 5', async () => {
    const { report, exitCode } = await doctor({ ...GOOD, blender: probeOut({ version: '1.1.0', sha256: SHA_B }) });
    expect(exitCode).toBe(5);
    const a = report.checks.find((c) => c.id === 'addons.sapling');
    expect(a).toMatchObject({ kind: 'addon', status: 'mismatch' });
    expect(a?.message).toContain('phiên bản 1.1.0');
    expect(a?.message).toContain('sha256 khác');
  });

  it('chỉ sha256 khác (cùng phiên bản) vẫn là mismatch', async () => {
    const { report } = await doctor({ ...GOOD, blender: probeOut({ version: '1.2.0', sha256: SHA_B }) });
    expect(report.checks.find((c) => c.id === 'addons.sapling')?.status).toBe('mismatch');
    expect(SHA_A).not.toBe(SHA_B);
  });

  it('Blender sai minor, add-on chưa cài → cả hai báo lỗi', async () => {
    const { report } = await doctor({ ...GOOD, blender: probeOut(null, '4.5.3') });
    expect(report.checks.find((c) => c.id === 'blender')).toMatchObject({
      status: 'mismatch',
      have: '4.5.3',
      want: '5.2.x',
    });
    expect(report.checks.find((c) => c.id === 'addons.sapling')).toMatchObject({ status: 'missing', have: 'chưa cài' });
  });

  it('đầu dò Blender không in GSPROBE → missing', async () => {
    const { report } = await doctor({ ...GOOD, blender: ok('Traceback: lỗi') });
    expect(report.checks.find((c) => c.id === 'blender')?.have).toBe('đầu dò không trả kết quả');
  });

  it('ffmpeg thiếu bộ mã aac (ADR-037) → missing, mã thoát 5; aac_mf hay libopus không được tính', async () => {
    const encoders = ' A....D libopus  libopus Opus\n A....D aac_mf  AAC via MediaFoundation (codec aac)';
    const { report, exitCode } = await doctor({ ...GOOD, 'ffmpeg -encoders': ok(encoders) });
    expect(exitCode).toBe(5);
    expect(report.checks.find((c) => c.id === 'ffmpeg.aac')?.status).toBe('missing');
  });

  it('công cụ tuỳ chọn thiếu (Claude Code) không làm hỏng', async () => {
    const { report, exitCode } = await doctor({ ...GOOD, 'claude --version': absent });
    expect(exitCode).toBe(0);
    expect(report.checks.find((c) => c.id === 'claudeCode')).toMatchObject({ status: 'missing', optional: true });
  });

  it('worker thiếu biến bắt buộc → ERR-DEV-05 có tên biến, mã thoát 5', async () => {
    const { report, exitCode } = await doctor(GOOD, { DATABASE_URL: 'postgres://x' }, 'worker');
    expect(exitCode).toBe(5);
    const t = report.checks.find((c) => c.id === 'env.GS_GATEWAY_TOKEN_WORKER');
    expect(t?.message).toBe('ERR-DEV-05 Thiếu biến môi trường GS_GATEWAY_TOKEN_WORKER (không hiển thị giá trị).');
    expect(report.checks.find((c) => c.id === 'env.DATABASE_URL')).toMatchObject({ status: 'ok', have: 'co' });
  });

  it('AC-09-06: giá trị khoá canary không xuất hiện trong báo cáo', async () => {
    const env = { GEMINI_API_KEY: CANARY, ELEVENLABS_API_KEY: CANARY, ANTHROPIC_API_KEY: CANARY };
    const { report } = await doctor(GOOD, env);
    const text = JSON.stringify(report);
    expect(text).not.toContain('CANARY');
    expect(text).not.toContain(String(CANARY.length));
    expect(report.checks.filter((c) => c.kind === 'env').map((c) => c.have)).toEqual(['co', 'co', 'co']);
  });

  it('biến rỗng coi như thiếu', async () => {
    const { report } = await doctor(GOOD, { GEMINI_API_KEY: '' });
    expect(report.checks.find((c) => c.id === 'env.GEMINI_API_KEY')?.have).toBe('khong');
  });
});

describe('đọc versions.json', () => {
  it('chấp nhận UTF-8 có BOM', async () => {
    const p = writeVersions();
    writeFileSync(p, '\uFEFF' + JSON.stringify(VERSIONS));
    const { exitCode } = await runDoctor({ versionsPath: p, probePath: 'p.py', env: {}, run: fakeRunner(GOOD) });
    expect(exitCode).toBe(0);
  });

  it('JSON hỏng → ERR-DEV-04 versions.json, mã thoát 5 (không phải 10)', async () => {
    const p = writeVersions();
    writeFileSync(p, '{ hỏng');
    const { report, exitCode } = await runDoctor({
      versionsPath: p,
      probePath: 'p.py',
      env: {},
      run: fakeRunner(GOOD),
    });
    expect(exitCode).toBe(5);
    expect(report.checks[0]?.message).toMatch(/^ERR-DEV-04 versions\.json/);
  });
});

describe('versions.json', () => {
  it('so khớp minor/exact', () => {
    expect(versionMatches('5.2.9', '5.2.4', 'minor')).toBe(true);
    expect(versionMatches('5.3.0', '5.2.4', 'minor')).toBe(false);
    expect(versionMatches('8.30.1', '8.30.1', 'exact')).toBe(true);
    expect(versionMatches('8.30.2', '8.30.1', 'exact')).toBe(false);
  });

  it('từ chối cấu trúc sai, chỉ rõ trường', () => {
    expect(() => parseVersionsFile({ node: { version: '24', match: 'loose' } })).toThrow(/node\.match/);
    expect(() => parseVersionsFile({ x: { version: '1', match: 'exact' } })).toThrow(/x: cần 'check'/);
    expect(() => parseVersionsFile({ addons: { a: { module: 'm', version: '1', sha256: 'zz' } } })).toThrow(/sha256/);
  });
});
