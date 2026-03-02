import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/*.integration.test.ts', '**/node_modules/**', '**/dist/**'],
    coverage: {
      exclude: [
        '**/dist/**',
        '**/coverage/**',
        '**/*.d.ts',
        'eslint.config.mjs',
        '**/vitest.*.config.ts',
      ],
    },
  },
});
