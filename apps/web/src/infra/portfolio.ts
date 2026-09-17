import { readPortfolio as readPortfolioIn } from '@rst0070/content/node'
import { CONTENT_ROOT } from './content'

/**
 * Read the raw portfolio markdown source. Unlike notes, the portfolio is a
 * single document with no frontmatter, so this simply returns its content.
 */
export function readPortfolio(): string {
    return readPortfolioIn(CONTENT_ROOT)
}
