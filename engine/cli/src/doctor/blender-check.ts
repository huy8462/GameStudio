// Kiểm Blender + add-on qua blender-probe.py (PSC-DEV-06; ADR-034: Blender 5.2, mã module bl_ext.blender_org.*).
import type { Runner } from './exec.js';
import { MS, mismatchMsg, missingCheck } from './checks.js';
import type { AddonSpec, DoctorCheck, ToolSpec } from './types.js';
import { mkCheck } from './types.js';
import { versionMatches, wantLabel } from './versions.js';

interface ProbeAddon {
  module: string;
  found: boolean;
  version?: string | null;
  loadable?: boolean;
  sha256?: string;
}

interface ProbeOut {
  version: string;
  addons: ProbeAddon[];
}

export function parseProbe(output: string): ProbeOut | undefined {
  const line = output.split(/\r?\n/).find((l) => l.startsWith('GSPROBE '));
  if (line === undefined) return undefined;
  try {
    const v = JSON.parse(line.slice('GSPROBE '.length)) as unknown;
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Partial<ProbeOut>;
    return typeof o.version === 'string' && Array.isArray(o.addons) ? (o as ProbeOut) : undefined;
  } catch {
    return undefined;
  }
}

function checkAddon(aid: string, a: AddonSpec, p: ProbeAddon | undefined): DoctorCheck {
  const id = `addons.${aid}`;
  if (p === undefined || !p.found) return missingCheck(id, 'addon', a.version, false, 'chưa cài');
  const have = p.version ?? '?';
  const problems: string[] = [];
  if (have !== a.version) problems.push(`phiên bản ${have}`);
  if (p.sha256 !== a.sha256) problems.push('sha256 khác bản đã cố định');
  if (p.loadable !== true) problems.push('không nạp được');
  if (problems.length === 0) {
    return mkCheck({ id, kind: 'addon', want: a.version, have, status: 'ok', message: `${a.module} ${have}.` });
  }
  const detail = problems.join(', ');
  return mkCheck({
    id,
    kind: 'addon',
    want: a.version,
    have: detail,
    status: 'mismatch',
    message: mismatchMsg(id, `${a.version} (sha256 cố định)`, detail),
  });
}

export async function checkBlender(
  spec: ToolSpec,
  addons: [string, AddonSpec][],
  probePath: string,
  run: Runner,
): Promise<DoctorCheck[]> {
  const want = wantLabel(spec.version, spec.match);
  const exe = spec.check?.[0] ?? 'blender';
  const modules = addons.map(([, a]) => a.module).join(',');
  const argv = [
    exe,
    '-b',
    '--factory-startup',
    '--python-exit-code',
    '1',
    '--python',
    probePath,
    '--',
    '--modules',
    modules,
  ];
  const r = await run(argv, (spec.timeoutS ?? 60) * MS);
  const notChecked = (): DoctorCheck[] =>
    addons.map(([aid, a]) => missingCheck(`addons.${aid}`, 'addon', a.version, false, 'chưa kiểm được'));
  if (!r.found) {
    return [
      missingCheck('blender', 'version', want, false, r.timedOut ? 'hết giờ' : 'không tìm thấy'),
      ...notChecked(),
    ];
  }
  const probe = parseProbe(r.output);
  if (probe === undefined) {
    return [missingCheck('blender', 'version', want, false, 'đầu dò không trả kết quả'), ...notChecked()];
  }
  const ok = versionMatches(probe.version, spec.version, spec.match);
  const out: DoctorCheck[] = [
    mkCheck({
      id: 'blender',
      kind: 'version',
      want,
      have: probe.version,
      status: ok ? 'ok' : 'mismatch',
      message: ok ? `blender ${probe.version}.` : mismatchMsg('blender', want, probe.version),
    }),
  ];
  for (const [aid, a] of addons)
    out.push(
      checkAddon(
        aid,
        a,
        probe.addons.find((x) => x.module === a.module),
      ),
    );
  return out;
}
