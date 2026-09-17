import path from 'path'

/**
 * Root directory of the site content (notes and portfolio markdown).
 * Every content path is derived from this, so relocating the content or
 * the app only requires changing this one line.
 */
export const CONTENT_ROOT = path.join(process.cwd(), 'content')
