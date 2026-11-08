import type { Scope } from './page-scope';
import type { Turn } from './use-chat';

// Every page is a full load, so the chat is kept in sessionStorage: it lives
// as long as the tab, and never reaches another tab or the server.

const STORAGE_KEY = 'chat';

export interface PersistedChat {
    /** What the conversation searched: a page's slug, or undefined for the whole site. */
    slug: string | undefined;
    open: boolean;
    turns: Turn[];
}

export function loadChat(): PersistedChat | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null) return null;
        const saved = JSON.parse(raw) as PersistedChat;
        return Array.isArray(saved.turns) ? saved : null;
    } catch {
        return null;
    }
}

export function saveChat(chat: PersistedChat): void {
    // An answer cut off by leaving the page is shown as stopped, with a retry.
    const turns = chat.turns.map((turn) =>
        turn.role === 'assistant' && turn.status === 'streaming' ? { ...turn, status: 'stopped' as const } : turn,
    );
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...chat, turns }));
    } catch {
        // Storage full or blocked: the chat still works on this page.
    }
}

/**
 * What a new page does with the saved chat, by the scope rules: a site-wide
 * chat carries on (and stays site-wide), a chat about a page carries on only
 * on that same page, and starts over anywhere else.
 */
export function resumeOn(saved: PersistedChat | null, pageSlug: string | undefined): { scope: Scope; turns: Turn[]; open: boolean } | null {
    if (saved === null || saved.turns.length === 0) return null;
    if (saved.slug === undefined) return { scope: 'site', turns: saved.turns, open: saved.open };
    if (saved.slug === pageSlug) return { scope: 'page', turns: saved.turns, open: saved.open };
    return null;
}
