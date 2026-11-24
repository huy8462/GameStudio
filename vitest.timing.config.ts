// Test đo thời gian thật (TST-DEV-02, NFR-DEV-02): tuần tự, một worker, để không bị các test khác tranh CPU (T-0006).
// Chạy: `pnpm test:timing`. `pnpm test` (vitest.config.ts) loại các tệp này.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.timing.test.ts', 'web/**/*.timing.test.ts', 'tools/**/*.timing.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    fileParallelism: false,
    maxWorkers: 1,
    passWithNoTests: false,
  },
});
