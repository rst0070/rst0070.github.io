import { describe, expect, it } from 'vitest';
import { pageSlugFromPath } from '../page-scope';

describe('pageSlugFromPath', () => {
    it.each([
        ['/notes/26-04-28-utilize-slm', '26-04-28-utilize-slm'],
        ['/notes/24-%ED%95%9C%EA%B8%80/', '24-한글'],
        ['/portfolio', 'portfolio'],
        ['/portfolio/', 'portfolio'],
        ['/', undefined],
        ['/notes', undefined],
        ['/notes/a/b', undefined],
        ['/notes/%E0%A4%A', undefined],
    ])('%s → %s', (path, slug) => {
        expect(pageSlugFromPath(path)).toBe(slug);
    });
});
