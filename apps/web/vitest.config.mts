import { defineConfig } from 'vitest/config';

// Unit tests for pure client-side helpers (no DOM, no React rendering).
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts'],
    },
});
