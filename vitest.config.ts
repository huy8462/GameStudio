// Vitest cho toàn repo (TSD-00 §10, DDD-00 §2.1: test cạnh mã *.test.ts).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts', 'web/**/*.test.ts', 'tools/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    passWithNoTests: true,
  },
});
