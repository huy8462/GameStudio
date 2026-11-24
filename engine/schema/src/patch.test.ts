// MOD-GEN-06: JSON Pointer RFC 6901, JSON Patch RFC 6902 (ví dụ chuẩn RFC 6902 phụ lục A), invertPatch, touchedFiles.
import { describe, expect, it } from 'vitest';

import { applyPatch, invertPatch, type JsonPatchOp, touchedFilesOf } from './patch.js';
import { formatPointer, type Json, parsePointer, pointerGet } from './pointer.js';

const ok = (doc: Json, ops: JsonPatchOp[]): Json => {
  const r = applyPatch(doc, ops);
  if (!r.ok) throw new Error(r.error.message);
  return r.value.doc;
};

describe('JSON Pointer', () => {
  it('mã hoá ~0 ~1, khứ hồi', () => {
    expect(parsePointer('/entities~1npc~1ong-lao.json/name')).toEqual(['entities/npc/ong-lao.json', 'name']);
    expect(parsePointer('/a~0b')).toEqual(['a~b']);
    expect(formatPointer(['entities/npc/x.json', 'a~b'])).toBe('/entities~1npc~1x.json/a~0b');
    expect(parsePointer('')).toEqual([]);
    expect(() => parsePointer('a')).toThrow();
  });
  it('get theo ví dụ RFC 6901', () => {
    const doc: Json = { foo: ['bar', 'baz'], '': 0, 'a/b': 1, 'm~n': 8 };
    expect(pointerGet(doc, '/foo/0')).toBe('bar');
    expect(pointerGet(doc, '/')).toBe(0);
    expect(pointerGet(doc, '/a~1b')).toBe(1);
    expect(pointerGet(doc, '/m~0n')).toBe(8);
    expect(() => pointerGet(doc, '/foo/2')).toThrow();
    expect(() => pointerGet(doc, '/foo/01')).toThrow();
  });
});

describe('JSON Patch (RFC 6902 phụ lục A)', () => {
  it('A.1–A.4 add/remove trên object và mảng', () => {
    expect(ok({ foo: 'bar' }, [{ op: 'add', path: '/baz', value: 'qux' }])).toEqual({ baz: 'qux', foo: 'bar' });
    expect(ok({ foo: ['bar', 'baz'] }, [{ op: 'add', path: '/foo/1', value: 'qux' }])).toEqual({
      foo: ['bar', 'qux', 'baz'],
    });
    expect(ok({ baz: 'qux', foo: 'bar' }, [{ op: 'remove', path: '/baz' }])).toEqual({ foo: 'bar' });
    expect(ok({ foo: ['bar', 'qux', 'baz'] }, [{ op: 'remove', path: '/foo/1' }])).toEqual({ foo: ['bar', 'baz'] });
  });
  it('A.5–A.7 replace, move', () => {
    expect(ok({ baz: 'qux', foo: 'bar' }, [{ op: 'replace', path: '/baz', value: 'boo' }])).toEqual({
      baz: 'boo',
      foo: 'bar',
    });
    const moved = ok({ foo: { bar: 'baz', waldo: 'fred' }, qux: { corge: 'grault' } }, [
      { op: 'move', from: '/foo/waldo', path: '/qux/thud' },
    ]);
    expect(moved).toEqual({ foo: { bar: 'baz' }, qux: { corge: 'grault', thud: 'fred' } });
    expect(ok({ foo: ['all', 'grass', 'cows', 'eat'] }, [{ op: 'move', from: '/foo/1', path: '/foo/3' }])).toEqual({
      foo: ['all', 'cows', 'eat', 'grass'],
    });
  });
  it('A.8–A.9 test thành công / thất bại; A.16 thêm cuối mảng bằng "-"', () => {
    const doc: Json = { baz: 'qux', foo: ['a', 2, 'c'] };
    expect(ok(doc, [{ op: 'test', path: '/foo', value: ['a', 2, 'c'] }])).toBe(doc);
    const r = applyPatch(doc, [{ op: 'test', path: '/baz', value: 'bar' }]);
    expect(r.ok).toBe(false);
    expect(ok({ foo: ['bar'] }, [{ op: 'add', path: '/foo/-', value: ['abc', 'def'] }])).toEqual({
      foo: ['bar', ['abc', 'def']],
    });
  });
  it('lỗi ở op thứ n → không đổi gì, báo opIndex', () => {
    const doc: Json = { a: 1 };
    const r = applyPatch(doc, [
      { op: 'replace', path: '/a', value: 2 },
      { op: 'remove', path: '/khong-co' },
    ]);
    expect(r).toMatchObject({ ok: false, error: { code: 'patch', opIndex: 1 } });
    expect(doc).toEqual({ a: 1 });
  });
  it('bất biến và chia sẻ cấu trúc không đổi', () => {
    const doc = { 'game.json': { a: 1 }, 'world.json': { zones: [{ id: 'z1' }] } } as Json;
    const out = ok(doc, [{ op: 'replace', path: '/game.json/a', value: 2 }]) as Record<string, Json>;
    expect((doc as Record<string, Record<string, number>>)['game.json']?.['a']).toBe(1);
    expect(out['world.json']).toBe((doc as Record<string, Json>)['world.json']);
  });
});

describe('touchedFiles, invertPatch', () => {
  it('touchedFiles = token đầu của path/from', () => {
    expect(
      touchedFilesOf([
        { op: 'replace', path: '/world.json/seed', value: 2 },
        { op: 'move', from: '/entities~1npc~1a.json/x', path: '/game.json/x' },
      ]),
    ).toEqual(['entities/npc/a.json', 'game.json', 'world.json']);
  });
  it('áp patch rồi áp patch đảo → trở về bản đầu (hoàn tác)', () => {
    const before = {
      'world.json': { seed: 1, zones: [{ id: 'z1' }], water: [] as Json[] },
      'game.json': { t: 'a' },
    } as Json;
    const ops: JsonPatchOp[] = [
      { op: 'replace', path: '/world.json/seed', value: 9 },
      { op: 'add', path: '/world.json/zones/-', value: { id: 'z2' } },
      { op: 'add', path: '/game.json/moi', value: true },
      { op: 'remove', path: '/game.json/t' },
      { op: 'copy', from: '/world.json/zones/0', path: '/world.json/water/0' },
      { op: 'move', from: '/world.json/zones/1', path: '/world.json/zones/0' },
      { op: 'add', path: '/world.json/seed', value: 10 },
    ];
    const after = ok(before, ops);
    expect(ok(after, invertPatch(before, ops))).toEqual(before);
  });
});
