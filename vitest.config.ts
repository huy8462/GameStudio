// Vitest cho toàn repo (TSD-00 §10, DDD-00 §2.1: test cạnh mã *.test.ts).
// Test đo thời gian thật (*.timing.test.ts, NFR-DEV-02) chạy riêng bằng `pnpm test:timing` (vitest.timing.config.ts, T-0006).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts', 'web/**/*.test.ts', 'tools/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'games/**/build/**', '**/*.timing.test.ts'],
    passWithNoTests: true,
  },
});
