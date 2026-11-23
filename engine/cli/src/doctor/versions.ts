// Đọc và so phiên bản theo tools/versions.json (SCH-DEV-03, DTO-DEV-03, CFG-GEN-01).
import type { AddonSpec, FeatureSpec, MatchRule, Role, ToolSpec, VersionsFile } from './types.js';
import { ROLES } from './types.js';

const RESERVED = new Set(['$schema', '//', 'addons']);

export function parseVersion(text: string, pattern: string): string | undefined {
  return new RegExp(pattern, 'm').exec(text)?.[1];
}

export function versionMatches(have: string, want: string, match: MatchRule): boolean {
  if (match === 'exact') return have === want;
  const [h1, h2] = have.split('.');
  const [w1, w2] = want.split('.');
  return h1 !== undefined && h1 === w1 && h2 === w2;
}

export function wantLabel(want: string, match: MatchRule): string {
  if (match === 'exact') return want;
  const [major, minor] = want.split('.');
  return `${major ?? want}.${minor ?? '0'}.x`;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strArray(v: unknown, where: string): string[] {
  if (!Array.isArray(v) || v.length === 0 || !v.every((x) => typeof x === 'string')) {
    throw new Error(`${where}: cần mảng chuỗi khác rỗng`);
  }
  return v as string[];
}

function str(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`${where}: cần chuỗi`);
  return v;
}

function parseFeature(v: unknown, where: string): FeatureSpec {
  if (!isObj(v)) throw new Error(`${where}: cần object`);
  return {
    id: str(v['id'], `${where}.id`),
    check: strArray(v['check'], `${where}.check`),
    expect: str(v['expect'], `${where}.expect`),
  };
}

function parseTool(id: string, v: unknown): ToolSpec {
  if (!isObj(v)) throw new Error(`${id}: cần object`);
  const match = v['match'];
  if (match !== 'exact' && match !== 'minor') throw new Error(`${id}.match: cần 'exact' hoặc 'minor'`);
  const spec: ToolSpec = { version: str(v['version'], `${id}.version`), match };
  const probe = v['probe'];
  if (probe !== undefined) {
    if (probe !== 'blender' && probe !== 'chromium' && probe !== 'pinned') throw new Error(`${id}.probe: không hợp lệ`);
    spec.probe = probe;
  }
  if (v['check'] !== undefined) spec.check = strArray(v['check'], `${id}.check`);
  if (v['parse'] !== undefined) spec.parse = str(v['parse'], `${id}.parse`);
  if (spec.probe === undefined && (spec.check === undefined || spec.parse === undefined)) {
    throw new Error(`${id}: cần 'check' và 'parse' (hoặc 'probe')`);
  }
  if (v['roles'] !== undefined) {
    const roles = strArray(v['roles'], `${id}.roles`);
    if (!roles.every((r) => (ROLES as readonly string[]).includes(r))) throw new Error(`${id}.roles: vai trò lạ`);
    spec.roles = roles as Role[];
  }
  if (v['optional'] === true) spec.optional = true;
  if (typeof v['timeoutS'] === 'number') spec.timeoutS = v['timeoutS'];
  if (v['features'] !== undefined) {
    if (!Array.isArray(v['features'])) throw new Error(`${id}.features: cần mảng`);
    spec.features = v['features'].map((f, i) => parseFeature(f, `${id}.features[${i}]`));
  }
  return spec;
}

function parseAddon(id: string, v: unknown): AddonSpec {
  if (!isObj(v)) throw new Error(`addons.${id}: cần object`);
  const sha256 = str(v['sha256'], `addons.${id}.sha256`);
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`addons.${id}.sha256: cần 64 ký tự hex`);
  return {
    module: str(v['module'], `addons.${id}.module`),
    version: str(v['version'], `addons.${id}.version`),
    sha256,
  };
}

/** Kiểm cấu trúc versions.json; ném Error có đường dẫn trường khi sai. */
export function parseVersionsFile(raw: unknown): VersionsFile {
  if (!isObj(raw)) throw new Error('versions.json: cần object');
  const tools = Object.entries(raw)
    .filter(([k]) => !RESERVED.has(k))
    .map(([k, v]): [string, ToolSpec] => [k, parseTool(k, v)]);
  const addonsRaw = raw['addons'] ?? {};
  if (!isObj(addonsRaw)) throw new Error('addons: cần object');
  const addons = Object.entries(addonsRaw).map(([k, v]): [string, AddonSpec] => [k, parseAddon(k, v)]);
  return { tools, addons };
}

export function appliesTo(spec: { roles?: Role[] }, role: Role): boolean {
  return spec.roles === undefined || spec.roles.includes(role);
}
