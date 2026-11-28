// T-0026: glb scene mặc định (PSC-CLI-02 bước 6), phép tính manifest (DTO-RTM-01, bước 8).
import { describe, expect, it } from 'vitest';

import { GlbError, readGlbJson, withDefaultScene, writeGlb } from './glb.js';
import { boundsOf, modulesOf, semverOf, spawnOf } from './manifest.js';

function glb(json: Record<string, unknown>, bin = Buffer.from([1, 2, 3, 4])): Buffer {
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(bin.length, 0);
  binHead.writeUInt32LE(0x004e4942, 4);
  return writeGlb(json, Buffer.concat([binHead, bin]));
}

describe('glb', () => {
  it('thêm scene 0 khi thiếu, giữ nguyên chunk BIN, độ dài bội 4, tất định', () => {
    const src = glb({ asset: { version: '2.0' }, scenes: [{ nodes: [0] }], nodes: [{}] });
    const a = withDefaultScene(src);
    expect(a.changed).toBe(true);
    expect(a.buf.length % 4).toBe(0);
    expect(a.buf.readUInt32LE(8)).toBe(a.buf.length);
    const { json, rest } = readGlbJson(a.buf);
    expect(json.scene).toBe(0);
    expect(rest.equals(readGlbJson(src).rest)).toBe(true);
    expect(withDefaultScene(src).buf.equals(a.buf)).toBe(true);
    expect(withDefaultScene(a.buf)).toEqual({ buf: a.buf, changed: false });
  });

  it('báo lỗi khi không phải glb hoặc không có cảnh', () => {
    expect(() => withDefaultScene(Buffer.from('khong phai glb du dai 20 byte'))).toThrow(GlbError);
    expect(() => withDefaultScene(glb({ asset: { version: '2.0' } }))).toThrow(/không có cảnh/);
  });
});

describe('manifest', () => {
  const world = {
    zones: [
      {
        id: 'z1',
        polygon: [
          [-250, -250],
          [0, -250],
          [0, 250],
          [-250, 250],
        ] as [number, number][],
      },
      {
        id: 'z2',
        polygon: [
          [0, -250],
          [250, -250],
          [250, 250],
          [0, 250],
        ] as [number, number][],
        neighbors: ['z1'],
      },
    ],
    regions: [
      {
        id: 'spawn',
        kind: 'spawn',
        polygon: [
          [100, 0],
          [110, 0],
          [110, 10],
          [100, 10],
        ] as [number, number][],
      },
    ],
  };

  it('bounds [x, z] từ đa giác; spawn là trọng tâm vùng spawn, zone xuất phát là zone chứa nó', () => {
    expect(boundsOf(world.zones[0]?.polygon ?? [])).toEqual({ min: [-250, -250], max: [0, 250] });
    expect(spawnOf(world)).toEqual({ zone: 'z2', x: 105, z: 5 });
    expect(spawnOf({ zones: world.zones })).toEqual({ zone: 'z1', x: -125, z: 0 });
    expect(() => spawnOf({ zones: [] })).toThrow();
  });

  it('module combat theo features (bước 8); engineVersion bỏ dấu caret', () => {
    expect(modulesOf({ features: { combat: { enabled: false }, hunting: { enabled: false } } })).toEqual({});
    expect(modulesOf({ features: { hunting: { enabled: true } } })).toEqual({ combat: true });
    expect(semverOf('^0.1.0')).toBe('0.1.0');
    expect(() => semverOf(undefined)).toThrow();
  });
});
