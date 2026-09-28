import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['lib/**', 'node_modules/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // src/client runs in the page; src/index.ts is the cordis host half (node).
    files: ['src/client/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // tsc already rejects undefined identifiers; no-undef cannot read TS types.
      'no-undef': 'off',
      // Host/plugin boundary surfaces are loosely typed on purpose (`ctx: any` etc.).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/index.ts', 'tests/**', '*.config.*'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
