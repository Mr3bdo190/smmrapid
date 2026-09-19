// Flat ESLint config — shared by both workspaces.
// Type-aware linting (TSLint recommended-type-checked) is intentionally NOT enabled yet:
// it needs a full project graph per workspace and slows CI; the type layer is covered by
// `npm run typecheck` (tsc --noEmit) which is stricter for this codebase.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // TypeScript and the runtime own these concerns; `no-undef` only produces noise on
      // .mjs test files that touch `process`/`fetch`.
      'no-undef': 'off',
      'no-console': 'off',
      'eqeqeq': ['error', 'smart'],
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
