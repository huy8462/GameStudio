// TST-DEV-01 / TC-DEV-01: hook chặn H-01, H-02, H-04 (AC-09-02, AC-09-03).
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { TMP, bash, file, read, run } from './hooks-harness.js';

afterAll(() => rmSync(TMP, { recursive: true, force: true }));

describe('H-01 .md lớn', () => {
  const body = `# Tiêu đề\n\n${'x'.repeat(100)}\n`.repeat(10) + '## Mục 2\n' + 'y'.repeat(61 * 1024);
  const big = file('docs/big.md', body);
  it('60 KB không offset → chặn (exit 2) + có heading (AC-09-02)', () => {
    const r = run('h01-large-md', read(big));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/^ERR-DEV-01: File lớn \(\d+ KB\)/);
    expect(r.stderr).toContain('L1 # Tiêu đề');
    expect(r.stderr).toContain('## Mục 2');
  });
  it('có offset/limit → cho', () => expect(run('h01-large-md', read(big, { offset: 1, limit: 40 })).code).toBe(0));
  it('.md nhỏ → cho', () => expect(run('h01-large-md', read(file('a.md', '# a\n'))).code).toBe(0));
});

describe('H-02 nhị phân, ảnh, log', () => {
  it('.glb → chặn', () => expect(run('h02-binary-log', read(join(TMP, 'm.glb'))).code).toBe(2));
  it('ảnh 2 MB → chặn; ảnh nhỏ → cho', () => {
    expect(run('h02-binary-log', read(file('big.png', Buffer.alloc(2 * 1024 * 1024)))).code).toBe(2);
    expect(run('h02-binary-log', read(file('small.png', Buffer.alloc(1024)))).code).toBe(0);
  });
  it('log 3.000 dòng → chặn; 100 dòng → cho; có limit → cho', () => {
    const big = file('run.log', 'line\n'.repeat(3000));
    expect(run('h02-binary-log', read(big)).stderr).toMatch(/^ERR-DEV-02/);
    expect(run('h02-binary-log', read(file('ok.log', 'line\n'.repeat(100)))).code).toBe(0);
    expect(run('h02-binary-log', read(big, { offset: 2900, limit: 100 })).code).toBe(0);
  });
});

describe('H-04 tệp bí mật', () => {
  it('.env → chặn (AC-09-03); .env.example → cho', () => {
    expect(run('h04-secrets', read(join(TMP, '.env'))).code).toBe(2);
    expect(run('h04-secrets', read(join(TMP, 'web', '.env.production'))).code).toBe(2);
    expect(run('h04-secrets', read(join(TMP, '.env.example'))).code).toBe(0);
  });
  it('khoá, pem, secrets/ → chặn; Grep vào .env → chặn', () => {
    for (const p of ['id.key', 'cert.pem', 'secrets/a.txt']) expect(run('h04-secrets', read(join(TMP, p))).code).toBe(2);
    expect(run('h04-secrets', { tool_name: 'Grep', tool_input: { pattern: 'KEY', path: join(TMP, '.env') } }).code).toBe(2);
    expect(run('h04-secrets', { tool_name: 'Grep', tool_input: { pattern: 'KEY', glob: '**/.env*' } }).code).toBe(2);
  });
});

describe('H-04 lệnh', () => {
  it.each([
    'git push --force origin main',
    'git push -f origin master',
    'rm -rf /',
    'rm -rf ~',
    'rm -rf *',
    'git reset --hard origin/main',
    'cat .env',
    'Get-Content .env.local',
    'type secrets\\db.txt',
    'printenv ANTHROPIC_API_KEY',
    'echo $GEMINI_API_KEY',
    'Get-ChildItem env:',
    'Remove-Item -Recurse -Force C:\\',
  ])('chặn: %s', (cmd) => {
    const r = run('h04-secrets', bash(cmd));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/^ERR-DEV-03: Không được đọc file bí mật hoặc chạy lệnh phá huỷ\. \(luật [\w-]+\)/);
  });
  it.each([
    'git push origin feature',
    'git push origin main',
    'rm -rf build/cache',
    'rm -rf ./dist',
    'cat .env.example',
    'pnpm test',
    'git reset --hard HEAD~1',
    'Remove-Item -Recurse dist',
  ])('cho: %s', (cmd) => expect(run('h04-secrets', bash(cmd)).code).toBe(0));
});
