// Kiểm checkUnity bằng thư mục tạm (DDD-09 PSC-DEV-06; không cần Unity thật).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ToolSpec } from './types.js';
import { checkUnity } from './unity-check.js';

const PKG = 'com.unity.cloud.ktx';
const spec: ToolSpec = { version: '6000.3.29f1', match: 'exact', probe: 'unity', packages: { [PKG]: '3.8.0' } };
const dirs: string[] = [];

interface Opts {
  editor?: boolean;
  webgl?: boolean;
  manifest?: string;
  lock?: string;
  proj?: string;
}

function setup(o: Opts) {
  const root = mkdtempSync(join(tmpdir(), 'gs-unity-'));
  dirs.push(root);
  const u = join(root, 'engine', 'unity');
  mkdirSync(join(u, 'ProjectSettings'), { recursive: true });
  mkdirSync(join(u, 'Packages'), { recursive: true });
  writeFileSync(join(u, 'ProjectSettings', 'ProjectVersion.txt'), `m_EditorVersion: ${o.proj ?? '6000.3.29f1'}\n`);
  writeFileSync(
    join(u, 'Packages', 'manifest.json'),
    JSON.stringify({ dependencies: { [PKG]: o.manifest ?? '3.8.0' } }),
  );
  writeFileSync(
    join(u, 'Packages', 'packages-lock.json'),
    JSON.stringify({ dependencies: { [PKG]: { version: o.lock ?? '3.8.0' } } }),
  );
  const hub = join(root, 'hub');
  if (o.editor !== false) {
    const pe = join(hub, '6000.3.29f1', 'Editor', 'Data', 'PlaybackEngines');
    mkdirSync(o.webgl === false ? pe : join(pe, 'WebGLSupport'), { recursive: true });
  }
  return { root, env: { UNITY_HUB_EDITORS: hub } as NodeJS.ProcessEnv };
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function statusOf(o: Opts): Record<string, string> {
  const { root, env } = setup(o);
  return Object.fromEntries(checkUnity(spec, root, env).map((c) => [c.id, c.status]));
}

describe('checkUnity', () => {
  it('đạt khi phiên bản, Editor, WebGL và gói khớp', () => {
    const s = statusOf({});
    expect(Object.values(s).every((v) => v === 'ok')).toBe(true);
    expect(Object.keys(s)).toContain(`unity.pkg.${PKG}`);
  });

  it('lệch ProjectVersion, thiếu Editor hoặc WebGL', () => {
    expect(statusOf({ proj: '6000.3.1f1' })['unity']).toBe('mismatch');
    expect(statusOf({ editor: false })['unity.editor']).toBe('missing');
    expect(statusOf({ webgl: false })['unity.webgl']).toBe('missing');
  });

  it('gói lệch manifest hoặc packages-lock', () => {
    expect(statusOf({ manifest: '3.7.0' })[`unity.pkg.${PKG}`]).toBe('mismatch');
    expect(statusOf({ lock: '3.7.0' })[`unity.pkg.${PKG}`]).toBe('mismatch');
  });

  it('thiếu thư mục dự án: unity missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'gs-unity-'));
    dirs.push(root);
    const c = checkUnity(spec, root, {});
    expect(c.find((x) => x.id === 'unity')?.status).toBe('missing');
  });
});
