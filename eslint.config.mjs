import globals from 'globals';
import tseslint from 'typescript-eslint';

// Root ESLint config for the monorepo
// Each app/package has its own eslint.config.mjs for specific rules

export default tseslint.config(
  {
    ignores: [
      // Build outputs
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.bak',
      // AI agent tooling dirs — not source code, may contain template syntax
      // that confuses ESLint's JS parser (e.g. skills, agents, claude prompts).
      '.agents/**',
      '.skills/**',
      '.serena/**',
      '.claude/**',
      '.turbo/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  // Relax rules for test files — mocks inherently use `any`
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
