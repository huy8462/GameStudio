// ESLint flat config. Nguồn: TSD-00 §4.3, DDD-00 §2.1, §2.4 (tất định), DDD-06 (chunk combat), ALG-GEN-01.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/cache/**',
      '**/generated/**',
      '.claude/**',
      'scripts/**',
      'docs/**',
      'games/**/build/**',
      '.venv/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // DDD-00 §2.1: không `any` ở API công khai.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // DDD-00 §2.4, ALG-GEN-01: tất định trong engine; dùng @gamestudio/rng và Clock tiêm.
    files: ['engine/**/*.{ts,tsx,js,mjs}'],
    ignores: ['engine/**/*.test.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Dùng @gamestudio/rng (ALG-GEN-01), không Math.random().' },
        { object: 'Date', property: 'now', message: 'Dùng Clock tiêm (DDD-00 §2.4), không Date.now().' },
      ],
    },
  },
  {
    // DDD-06: mã ngoài combat/ không import tĩnh combat/**; chỉ Engine.enableOptional('combat') dùng import().
    files: ['engine/runtime/src/**/*.ts'],
    ignores: ['engine/runtime/src/combat/**', 'engine/runtime/src/dialogue-ai/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/combat', '**/combat/**'],
              message: 'Chunk tuỳ chọn: chỉ import() động (DDD-06, TSD-00 §2.4 #7).',
            },
            { group: ['**/dialogue-ai', '**/dialogue-ai/**'], message: 'Chunk tuỳ chọn: chỉ import() động (TSD-07).' },
          ],
        },
      ],
    },
  },
  {
    // Runtime chạy trong trình duyệt (TSD-00 §4.2).
    files: ['engine/runtime/**/*.{ts,tsx}', 'web/app/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
