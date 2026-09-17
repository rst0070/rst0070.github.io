import { describe, expect, it } from 'vitest';
import { linkCitationMarkers } from '../citations';

const citations = [
    { slug: 'a', title: 'A', url: '/notes/a' },
    { slug: 'portfolio', title: 'Portfolio', url: '/portfolio' },
];

describe('linkCitationMarkers', () => {
    it('links [n], [n, m] and the 【n†source】 form', () => {
        expect(linkCitationMarkers('Uses k3s [1]. See [1, 2] and 【2†source】.', citations)).toBe(
            'Uses k3s [\\[1\\]](/notes/a). See [\\[1\\]](/notes/a)[\\[2\\]](/portfolio) and [\\[2\\]](/portfolio).',
        );
    });

    it('leaves unknown numbers, existing links and code alone', () => {
        const text = 'No source [3], a link [1](https://x.example), `arr[1]` and\n```\nxs[2]\n```\nthen [2].';

        expect(linkCitationMarkers(text, citations)).toBe(
            'No source [3], a link [1](https://x.example), `arr[1]` and\n```\nxs[2]\n```\nthen [\\[2\\]](/portfolio).',
        );
    });

    it('leaves an unfinished code fence alone while it streams', () => {
        expect(linkCitationMarkers('Before [1]\n```py\nx = y[1]', citations)).toBe('Before [\\[1\\]](/notes/a)\n```py\nx = y[1]');
    });
});
