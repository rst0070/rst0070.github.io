import { defineConfig } from 'vitest/config'

// Plain Node: core tests use fakes, and adapter/repository/container tests fake
// the AI and Vectorize bindings, so no workerd pool is needed.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts'],
    },
})
