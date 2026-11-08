import { readPortfolio as readPortfolioIn } from '@rst0070/content/node'
import type { Lang } from '@/head'
import { CONTENT_ROOT } from './content'

/**
 * Read the raw portfolio markdown source in `lang`: `content/portfolio.md`
 * for English, `content/portfolio.<lang>.md` otherwise. Unlike notes, the
 * portfolio is a single document with no frontmatter. Throws, naming the
 * file, when the translation is missing.
 */
export function readPortfolio(lang: Lang = 'en'): string {
    return readPortfolioIn(CONTENT_ROOT, lang)
}
