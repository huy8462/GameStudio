// T-0009 (IF-DEV-03): đối số đến chương trình nguyên vẹn qua .exe trực tiếp và qua shim .cmd (cmd.exe).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runCommand } from './exec.js';
import { escapeCmd, planWin, quoteArg, whichWin } from './win-spawn.js';

const WIN = process.platform === 'win32';
const NASTY = [
  'đơn',
  'có dấu cách',
  'ngoặc "kép" ở giữa',
  'import numpy; print("numpy", numpy.__version__)',
  'a&b|c<d>e',
  '(x) %PATH% ^ !y!',
  'c:\\thư mục\\',
  '',
];

const dir = mkdtempSync(join(tmpdir(), 'gs-winspawn-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const echoJs = join(dir, 'echo-args.js');
writeFileSync(echoJs, 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');

describe('quoteArg / escapeCmd', () => {
  it.each([
    ['abc', 'abc'],
    ['a b', '"a b"'],
    ['', '""'],
    ['a"b', '"a\\"b"'],
    ['c:\\d e\\', '"c:\\d e\\\\"'],
    ['x\\"y', '"x\\\\\\"y"'],
  ])('quoteArg(%j) = %j', (a, q) => expect(quoteArg(a)).toBe(q));

  it('escapeCmd thoát ký tự đặc biệt, hai lần cho batch', () => {
    expect(escapeCmd('a&b', 1)).toBe('a^&b');
    expect(escapeCmd('a&b', 2)).toBe('a^^^&b');
    expect(escapeCmd('"x y"', 1)).toBe('^"x^ y^"');
  });
});

describe.runIf(WIN)('Windows: chạy thật', () => {
  it('whichWin tìm theo PATH + PATHEXT; không có → undefined', () => {
    const env = { PATH: dirname(process.execPath), PATHEXT: '.COM;.EXE;.CMD' };
    expect(whichWin('node', env)?.toLowerCase()).toBe(process.execPath.toLowerCase());
    expect(whichWin('khong-co-chuong-trinh-nay', env)).toBeUndefined();
    expect(planWin(['khong-co-chuong-trinh-nay'], env)).toBeUndefined();
  });

  it('.exe trực tiếp: đối số nguyên vẹn', async () => {
    const r = await runCommand([process.execPath, echoJs, ...NASTY], 10_000);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.output.trim())).toEqual(NASTY);
  });

  it('shim .cmd qua cmd.exe: đối số nguyên vẹn', async () => {
    const shim = join(dir, 'echo-shim.cmd');
    writeFileSync(shim, `@"${process.execPath}" "${echoJs}" %*\r\n`);
    const env = { ...process.env, PATH: `${dir};${process.env['PATH'] ?? ''}` };
    const plan = planWin([basename(shim, '.cmd'), 'x'], env);
    expect(plan?.verbatim).toBe(true);
    const r = await runCommand([shim, ...NASTY], 10_000);
    expect(r.code, r.output).toBe(0);
    expect(JSON.parse(r.output.trim())).toEqual(NASTY);
  });

  it('không tìm thấy chương trình → found false, không spawn', async () => {
    expect(await runCommand(['khong-co-chuong-trinh-nay-123', '--version'], 5_000)).toEqual({
      found: false,
      code: null,
      output: '',
      timedOut: false,
    });
  });
});
