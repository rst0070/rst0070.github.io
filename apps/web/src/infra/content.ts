import path from 'path'

/**
 * Root directory of the site content (notes and portfolio markdown), at the
 * repository root. Every content path is derived from this, so relocating the
 * content or the app only requires changing this one line.
 *
 * Resolved from `process.cwd()`, which is the app package directory
 * (`apps/web`) for `next dev` and `next build`, including when they are run
 * from the repository root via `pnpm --filter @rst0070/web`.
 */
export const CONTENT_ROOT = path.join(process.cwd(), '..', '..', 'content')
