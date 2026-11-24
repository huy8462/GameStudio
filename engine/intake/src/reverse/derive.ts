// deriveFields (MOD-INT-23, PSC-INT-13, ALG-INT-11): trường brief suy TẤT ĐỊNH từ dữ liệu game có sẵn, không gọi mô hình.
// Nguồn ghi dạng '<tệp trong data/>#<JSON Pointer>'. Trường không có trong dữ liệu thì bỏ (để mô hình hoặc câu hỏi điền).
import type { FieldKey, GameDataFiles } from '../types.js';

export interface Derived {
  value: unknown;
  sources: string[];
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const pos = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : 1);

/** Diện tích (km²) hình bao của đa giác [x, z] mét, làm tròn 2 chữ số. */
function bboxKm2(poly: unknown): number | undefined {
  if (!Array.isArray(poly) || poly.length < 3) return undefined;
  const pts = poly.filter((p): p is [number, number] => Array.isArray(p) && p.every((n) => typeof n === 'number'));
  if (pts.length < 3) return undefined;
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const m2 = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
  return m2 > 0 ? Math.round(m2 / 10_000) / 100 : undefined;
}

/** Tệp thực thể sắp theo tên (tất định). */
const entities = (data: GameDataFiles, dir: string): [string, Record<string, unknown>][] =>
  Object.keys(data)
    .filter((k) => k.startsWith(`entities/${dir}/`) && k.endsWith('.json'))
    .sort()
    .map((k) => [k, obj(data[k])]);

export function deriveFields(data: GameDataFiles): Partial<Record<FieldKey, Derived>> {
  const out: Partial<Record<FieldKey, Derived>> = {};
  const g = obj(data['game.json']);
  const w = obj(data['world.json']);
  const set = (k: FieldKey, value: unknown, sources: string[]): void => {
    if (value !== undefined) out[k] = { value, sources };
  };

  set('title', str(g['title']), ['game.json#/title']);
  const cam = obj(g['camera'])['mode'];
  set('camera', cam === 'first_person' || cam === 'third_person' ? cam : undefined, ['game.json#/camera/mode']);
  const f = obj(g['features']);
  const enabled = (k: string): boolean | undefined => {
    const e = obj(f[k])['enabled'];
    return typeof e === 'boolean' ? e : undefined;
  };
  set('features.combat', enabled('combat'), ['game.json#/features/combat/enabled']);
  set('features.hunting', enabled('hunting'), ['game.json#/features/hunting/enabled']);
  const dm = f['dialogueMode'];
  set('features.dialogueMode', dm === 'static' || dm === 'ai' || dm === 'hybrid' ? dm : undefined, [
    'game.json#/features/dialogueMode',
  ]);

  const source = str(w['source']);
  set('setting.realPlace', source === undefined ? undefined : source !== 'procedural', ['world.json#/source']);
  const tod = Array.isArray(w['timeOfDay'])
    ? (w['timeOfDay'] as unknown[]).map((t) => str(obj(t)['id'])).filter((t): t is string => t !== undefined)
    : [];
  set('setting.timeOfDay', tod.length > 0 ? tod : undefined, ['world.json#/timeOfDay']);
  const area = bboxKm2(w['playArea']);
  const zones = Array.isArray(w['zones']) ? w['zones'].length : 0;
  set('scale', area !== undefined && zones > 0 ? { zones, areaKm2: area } : undefined, [
    'world.json#/playArea',
    'world.json#/zones',
  ]);

  const animals = entities(data, 'animals')
    .map(([k, e]) => ({ k, species: str(e['species']), count: pos(e['count']) }))
    .filter((a) => a.species !== undefined);
  if (animals.length > 0)
    set(
      'animals',
      animals.map((a) => ({ species: a.species, count: a.count })),
      animals.map((a) => `${a.k}#/species`),
    );
  const npcs = entities(data, 'npc')
    .map(([k, e]) => {
      const key = str(e['name']) !== undefined ? 'name' : 'id';
      return { k: `${k}#/${key}`, name: str(e[key]), role: str(e['role']) ?? '', count: pos(e['count']) };
    })
    .filter((n) => n.name !== undefined);
  if (npcs.length > 0)
    set(
      'npcs',
      npcs.map((n) => ({ name: n.name, role: n.role, count: n.count })),
      npcs.map((n) => n.k),
    );
  return out;
}
