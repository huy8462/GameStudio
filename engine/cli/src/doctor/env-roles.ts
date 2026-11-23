// Biến môi trường theo vai trò máy (ALG-DEV-06, PSC-DEV-06, FR-DEV-20, FR-DEV-22).
// QT-DEV-06: chỉ biết "có / không". Không đọc độ dài, không băm, không in giá trị.
import type { DoctorCheck, Role } from './types.js';
import { mkCheck } from './types.js';

interface EnvSpec {
  name: string;
  optional: boolean;
}

export const ENV_BY_ROLE: Record<Role, readonly EnvSpec[]> = {
  // Theo PSC-DEV-06: dev cần GEMINI/ELEVENLABS; ANTHROPIC tuỳ chọn (chế độ chuyển giao TSD-01).
  // Huy chốt 23/11/2026: làm game qua gói Max nên GEMINI/ELEVENLABS chỉ cần khi sinh ảnh/âm thanh → để tuỳ chọn.
  dev: [
    { name: 'GEMINI_API_KEY', optional: true },
    { name: 'ELEVENLABS_API_KEY', optional: true },
    { name: 'ANTHROPIC_API_KEY', optional: true },
  ],
  worker: [
    { name: 'GS_GATEWAY_TOKEN_WORKER', optional: false },
    { name: 'DATABASE_URL', optional: false },
  ],
  ci: [],
};

export function hasEnv(env: NodeJS.ProcessEnv, name: string): boolean {
  const v = env[name];
  return typeof v === 'string' && v !== '';
}

export function checkEnv(role: Role, env: NodeJS.ProcessEnv): DoctorCheck[] {
  return ENV_BY_ROLE[role].map(({ name, optional }) => {
    const present = hasEnv(env, name);
    return mkCheck({
      id: `env.${name}`,
      kind: 'env',
      have: present ? 'co' : 'khong',
      status: present ? 'ok' : 'missing',
      optional,
      message: present
        ? `${name}: có.`
        : `ERR-DEV-05 Thiếu biến môi trường ${name} (không hiển thị giá trị).${optional ? ' Tuỳ chọn.' : ''}`,
    });
  });
}
