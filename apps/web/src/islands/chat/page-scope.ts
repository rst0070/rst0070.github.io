/** What a chat searches: the page being viewed, or the whole site. */
export type Scope = 'page' | 'site';

/**
 * The indexed page a path shows, as the slug the Worker filters retrieval by:
 * a note's slug on `/notes/<slug>`, `portfolio` on `/portfolio`. Undefined
 * elsewhere (home, the notes list), where chat covers the whole site.
 */
export function pageSlugFromPath(pathname: string): string | undefined {
    if (/^\/portfolio\/?$/.test(pathname)) return 'portfolio';
    const note = /^\/notes\/([^/]+)\/?$/.exec(pathname);
    if (note === null) return undefined;
    try {
        return decodeURIComponent(note[1]);
    } catch {
        return undefined;
    }
}
