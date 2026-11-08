import { Citation } from './chat-api';

/**
 * Turns source markers in an answer into Markdown links to the cited page.
 * The Worker numbers sources so that `[n]` is `citations[n - 1]`. Handles
 * `[1]`, `[1, 2]` and the `【1】` / `【1†source】` form gpt-oss sometimes uses.
 * Code spans and fenced code are left alone, as are numbers with no citation
 * and `[n](...)`, which is already a link.
 */
export function linkCitationMarkers(markdown: string, citations: Citation[]): string {
    return markdown
        .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/)
        .map((part, i) => (i % 2 === 1 ? part : linkMarkersInText(part, citations)))
        .join('');
}

const MARKER = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()|【(\d+(?:\s*,\s*\d+)*)(?:†[^】]*)?】/g;

function linkMarkersInText(text: string, citations: Citation[]): string {
    return text.replace(MARKER, (marker: string, bracketed?: string, lenticular?: string) => {
        const numbers = (bracketed ?? lenticular ?? '').split(',').map((n) => Number(n.trim()));
        if (!numbers.every((n) => citations[n - 1] !== undefined)) return marker;
        return numbers.map((n) => `[\\[${n}\\]](${encodeURI(citations[n - 1].url)})`).join('');
    });
}
