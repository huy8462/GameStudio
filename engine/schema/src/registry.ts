// Danh mục schema và bảng kindByPath (DDD-00 §3.3, SCH-GEN-01…03). Nguồn duy nhất cho validate.ts và gen-validators.
import budgetsV1 from '../schemas/budgets/1.json' with { type: 'json' };
import commonV1 from '../schemas/common/1.json' with { type: 'json' };
import gameV1 from '../schemas/game/1.json' with { type: 'json' };
import paletteV1 from '../schemas/palette/1.json' with { type: 'json' };
import worldV1 from '../schemas/world/1.json' with { type: 'json' };
import worldDefsV1 from '../schemas/world/defs-1.json' with { type: 'json' };
import worldPartsV1 from '../schemas/world/parts-1.json' with { type: 'json' };

export const SCHEMA_KINDS = ['budgets', 'game', 'palette', 'world'] as const;
export type SchemaKind = (typeof SCHEMA_KINDS)[number];

const BASE = 'https://gamestudio.local/schema';

/** Mọi tài liệu schema (gốc + phần dùng chung được $ref). */
export const SCHEMA_DOCS: readonly object[] = [
  commonV1,
  worldPartsV1,
  worldDefsV1,
  budgetsV1,
  gameV1,
  paletteV1,
  worldV1,
];

/** $id của schema gốc theo kind. */
export const ROOT_IDS: Readonly<Record<SchemaKind, string>> = {
  budgets: `${BASE}/budgets/1.json`,
  game: `${BASE}/game/1.json`,
  palette: `${BASE}/palette/1.json`,
  world: `${BASE}/world/1.json`,
};

/** Đường dẫn tương đối `games/<id>/`, dùng '/'. */
const KIND_BY_PATH: readonly [RegExp, SchemaKind][] = [
  [/^data\/budgets\.json$/, 'budgets'],
  [/^data\/game\.json$/, 'game'],
  [/^data\/palette\.json$/, 'palette'],
  [/^data\/world\.json$/, 'world'],
];

export function kindByPath(relPath: string): SchemaKind | undefined {
  const p = relPath.replace(/\\/g, '/');
  return KIND_BY_PATH.find(([re]) => re.test(p))?.[1];
}
