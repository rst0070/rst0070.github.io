'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatIcon, CloseIcon } from './icons';
import { pageSlugFromPath, Scope } from './page-scope';
import { useChat } from './use-chat';
import './chat.css';

// The Worker's URL, inlined at build time. Unset (a local build without
// .env.local, for example), the widget is not rendered at all.
const API_URL = process.env.NEXT_PUBLIC_AI_API_URL ?? '';

// Loaded on first open, so pages don't ship the chat UI and Markdown renderer
// until someone uses it.
const ChatPanel = dynamic(() => import('./chat-panel').then((module) => module.ChatPanel), {
    ssr: false,
    loading: () => <div className="chat-panel" aria-busy="true" />,
});

export function ChatWidget() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false);
    const [scope, setScope] = useState<Scope>('page');
    const pageSlug = pageSlugFromPath(pathname);
    const slug = scope === 'page' ? pageSlug : undefined;
    // Held here, not in the lazy panel, so the conversation survives
    // client-side navigation and closing the panel.
    const chat = useChat(API_URL, slug);

    // When navigation changes what the chat searches: a site-wide chat carries
    // on (pinning the scope to the whole site), a chat about one page starts
    // over. Scope changes by the reader reset the chat themselves.
    const lastSlug = useRef(slug);
    useEffect(() => {
        const previous = lastSlug.current;
        lastSlug.current = slug;
        if (previous === slug || chat.turns.length === 0) return;
        if (previous === undefined) {
            lastSlug.current = undefined;
            setScope('site');
        } else {
            chat.reset();
        }
    }, [slug, chat]);

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
                    <ChatPanel
                        chat={chat}
                        scopedToPage={slug !== undefined}
                        pageSlug={pageSlug}
                        scope={slug === undefined ? 'site' : 'page'}
                        onScopeChange={changeScope}
                        open={open}
                        onClose={() => setOpen(false)}
                    />
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
