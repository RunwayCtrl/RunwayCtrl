import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    coverage: {
      exclude: [
        '**/dist/**',
        '**/coverage/**',
        '**/*.d.ts',
        'eslint.config.mjs',
        '**/vitest.*.config.ts',
      ],
    },

    // Phase 0 note: we may not have integration tests yet.
    // Keep CI green until the first integration test suite lands.
    passWithNoTests: true,

    // Integration tests tend to be slower (DB, Docker, external services).
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
