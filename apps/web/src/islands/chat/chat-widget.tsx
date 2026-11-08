import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ChatIcon, CloseIcon } from './icons';
import { pageSlugFromPath, Scope } from './page-scope';
import { loadChat, resumeOn, saveChat } from './persisted-chat';
import { useChat } from './use-chat';
import './chat.css';

// The Worker's URL, inlined at build time. Unset (a local build without
// .env.local, for example), the widget is not rendered at all.
export const API_URL = import.meta.env.VITE_AI_API_URL ?? '';

// Loaded on first open, so pages don't ship the chat UI and Markdown renderer
// until someone uses it.
const ChatPanel = lazy(() => import('./chat-panel').then((module) => ({ default: module.ChatPanel })));

export function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false);
    const [scope, setScope] = useState<Scope>('page');
    // Read once on mount: the page never changes in place.
    const [pageSlug, setPageSlug] = useState<string | undefined>(undefined);
    const slug = scope === 'page' ? pageSlug : undefined;
    const chat = useChat(API_URL, slug);
    const resumed = useRef(false);

    // After hydration, so the server HTML (a closed launcher) still matches.
    useEffect(() => {
        const current = pageSlugFromPath(window.location.pathname);
        setPageSlug(current);
        const resume = resumeOn(loadChat(), current);
        if (resume !== null) {
            setScope(resume.scope);
            chat.restore(resume.turns);
            setOpened(resume.open);
            setOpen(resume.open);
        }
        resumed.current = true;
    }, []);

    useEffect(() => {
        if (resumed.current) saveChat({ slug, open, turns: chat.turns });
    }, [slug, open, chat.turns]);

    if (API_URL === '') return null;

    const changeScope = (next: Scope) => {
        if (next === scope) return;
        chat.reset();
        setScope(next);
    };

    const toggle = () => {
        setOpened(true);
        setOpen((previous) => !previous);
    };

    return (
        <div className="chat-widget">
            {opened && (
                <div hidden={!open}>
                    <Suspense fallback={<div className="chat-panel" aria-busy="true" />}>
                        <ChatPanel
                            chat={chat}
                            scopedToPage={slug !== undefined}
                            pageSlug={pageSlug}
                            scope={slug === undefined ? 'site' : 'page'}
                            onScopeChange={changeScope}
                            open={open}
                            onClose={() => setOpen(false)}
                        />
                    </Suspense>
                </div>
            )}
            <button
                type="button"
                className="chat-launcher"
                aria-expanded={open}
                aria-controls="chat-panel"
                aria-label={open ? 'Close chat' : 'Ask about this site'}
                title={open ? 'Close chat' : 'Ask about this site'}
                onClick={toggle}
            >
                {open ? <CloseIcon /> : <ChatIcon />}
            </button>
        </div>
    );
}
