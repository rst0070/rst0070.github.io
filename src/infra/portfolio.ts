import fs from 'fs'
import path from 'path'

/**
 * Read the raw portfolio markdown source. Unlike notes, the portfolio is a
 * single document with no frontmatter, so this simply returns its content.
 */
export function readPortfolio(): string {
    const portfolioPath = path.join(
        process.cwd(),
        'src',
        'portfolio',
        'portfolio.md'
    )
    return fs.readFileSync(portfolioPath, 'utf-8')
}
