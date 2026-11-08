import { defineConfig } from 'vitest/config';

// Unit tests for pure client-side helpers (no DOM, no React rendering), and
// checks over the built site in dist/ (test/, run after `pnpm build`).
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts', 'test/**/*.test.ts'],
    },
});
