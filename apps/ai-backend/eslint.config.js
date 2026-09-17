// Layer rules from ARCHITECTURE.md, as import restrictions. Rule numbers refer
// to that document.

import { defineConfig } from 'eslint/config'
import { importX } from 'eslint-plugin-import-x'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import tseslint from 'typescript-eslint'

const CORE_FILES = ['src/core/**/*.ts']
const CORE_TEST_FILES = ['src/core/**/__tests__/**/*.ts']

/** Rule 10: bindings and secrets reach code through the container, never `env` imports. */
const NO_ENV_IMPORT = {
    name: 'cloudflare:workers',
    importNames: ['env'],
    message: 'Read bindings from `env` only in src/index.ts and pass them down (rule 10).',
}

/**
 * Rule 1: core imports only relative modules (kept inside core by the zones
 * below) and the pure `@rst0070/content` entry. An allowlist, so Node
 * builtins, `cloudflare:*`, `@cloudflare/*`, wrangler, `@rst0070/content/node`
 * and every other package are all refused.
 */
function coreImports(allowedPackages) {
    const allowed = allowedPackages.map((name) => `${name.replace(/[/.]/g, '\\$&')}$`).join('|')
    return ['error', {
        paths: [NO_ENV_IMPORT],
        patterns: [{
            regex: `^(?!\\.|${allowed})`,
            message: `src/core may import only core modules and ${allowedPackages.join(', ')} (rule 1).`,
        }],
    }]
}

export default defineConfig(
    { ignores: ['node_modules/', '.wrangler/', 'worker-configuration.d.ts'] },
    tseslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.js'],
        plugins: { 'import-x': importX },
        settings: {
            'import-x/resolver-next': [createTypeScriptImportResolver({ project: import.meta.dirname })],
        },
        rules: {
            'import-x/no-restricted-paths': ['error', {
                basePath: import.meta.dirname,
                zones: [
                    {
                        target: './src/core',
                        from: '.',
                        except: ['./src/core'],
                        message: 'src/core must not import from outside src/core (rule 1).',
                    },
                    {
                        target: './src/adapter',
                        from: './src',
                        except: ['./adapter', './core/entity', './core/port', './core/repository', './core/error'],
                        message: 'Adapters import only core/entity, core/port, core/repository and core/error (rule 7).',
                    },
                    {
                        target: './src/repositories',
                        from: './src',
                        except: ['./repositories', './core/entity', './core/port', './core/repository', './core/error'],
                        message: 'Repositories import only core/entity, core/port, core/repository and core/error (rule 7).',
                    },
                    {
                        target: './src/http',
                        from: './src',
                        except: ['./http', './core/usecase', './core/entity', './core/error'],
                        message: 'http/ consumes usecases (plus core entities and errors) only (rule 8).',
                    },
                    {
                        target: './script',
                        from: './src',
                        except: ['./core/entity', './core/service'],
                        message: 'Scripts may import only core/entity and core/service from src (rule 12).',
                    },
                    {
                        // Every file but src/index.ts, src/diContainer.ts itself and its test.
                        target: [
                            './script/**',
                            './src/!(index|diContainer).ts',
                            './src/!(__tests__)/**',
                            './src/__tests__/!(diContainer.test).ts',
                        ],
                        from: './src/diContainer.ts',
                        message: 'Only src/index.ts (and its test) may import the container (rule 13).',
                    },
                ],
            }],
            'no-restricted-imports': ['error', { paths: [NO_ENV_IMPORT] }],
        },
    },
    {
        files: CORE_FILES,
        ignores: CORE_TEST_FILES,
        rules: { 'no-restricted-imports': coreImports(['@rst0070/content']) },
    },
    {
        files: CORE_TEST_FILES,
        rules: { 'no-restricted-imports': coreImports(['@rst0070/content', 'vitest']) },
    },
    {
        files: ['src/index.ts'],
        rules: { 'no-restricted-imports': 'off' },
    },
)
