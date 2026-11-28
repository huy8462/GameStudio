// tools/versions.json thật phải hợp lệ (SCH-DEV-03) và tìm được từ thư mục con.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseVersionsFile } from '../doctor/versions.js';
import { findVersionsFile } from './doctor.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('tools/versions.json của repo', () => {
  it('tìm được từ engine/cli/src/commands và hợp lệ', () => {
    const p = findVersionsFile(here);
    expect(p).toBeDefined();
    const v = parseVersionsFile(JSON.parse(readFileSync(p as string, 'utf8')) as unknown);
    const ids = v.tools.map(([id]) => id);
    // SCH-DEV-03 / DTO-DEV-03: đủ các mục đã định.
    for (const id of [
      'node',
      'pnpm',
      'python',
      'uv',
      'blender',
      'ktx',
      'gltfTransform',
      'ffmpeg',
      'gitleaks',
      'playwright',
      'chromium',
      'unity',
      'claudeCode',
    ]) {
      expect(ids).toContain(id);
    }
    expect(v.addons.map(([id]) => id).sort()).toEqual(['ant_landscape', 'sapling']);
    // ADR-034: Blender 5.2.
    expect(v.tools.find(([id]) => id === 'blender')?.[1].version).toMatch(/^5\.2\./);
  });

  it('blender-probe.py nằm đúng chỗ lệnh doctor tìm', () => {
    const probe = join(here, '..', 'doctor', 'blender-probe.py');
    expect(readFileSync(probe, 'utf8')).toContain('GSPROBE');
  });
});
