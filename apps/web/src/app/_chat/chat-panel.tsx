'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { linkCitationMarkers } from './citations';
import { errorMessage } from './error-message';
import { CloseIcon } from './icons';
import { Scope } from './page-scope';
import { Chat, Turn } from './use-chat';

// Longer questions are rarely useful here; the Worker's own limit is higher.
const MAX_QUESTION_LENGTH = 2000;

const PAGE_SUGGESTIONS = ['Summarize this page', 'What are the key takeaways?'];
const SITE_SUGGESTIONS = ['What does the author work on?', 'Which notes are about Kubernetes?'];

export interface ChatPanelProps {
    chat: Chat;
    /** Whether retrieval is limited to the page being viewed. */
    scopedToPage: boolean;
    /** The indexed page being viewed, if any; offers the page/site switch. */
    pageSlug: string | undefined;
    scope: Scope;
    onScopeChange: (scope: Scope) => void;
    open: boolean;
    onClose: () => void;
}

export function ChatPanel({ chat, scopedToPage, pageSlug, scope, onScopeChange, open, onClose }: ChatPanelProps) {
    const { turns, streaming, send, retry, stop, reset } = chat;
    const [draft, setDraft] = useState('');
    const input = useRef<HTMLTextAreaElement>(null);
    const log = useRef<HTMLDivElement>(null);
    const pinnedToBottom = useRef(true);

    useEffect(() => {
        if (open) input.current?.focus();
    }, [open]);

    // Follow the answer as it streams, unless the reader scrolled up.
    useLayoutEffect(() => {
        const element = log.current;
        if (element !== null && pinnedToBottom.current) element.scrollTop = element.scrollHeight;
    }, [turns]);

    const onScroll = () => {
        const element = log.current;
        if (element === null) return;
        pinnedToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
    };

    const submit = (text: string) => {
        if (streaming || text.trim() === '') return;
        pinnedToBottom.current = true;
        send(text);
        setDraft('');
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        submit(draft);
    };

    const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        // isComposing: Enter that confirms Korean/Japanese IME input must not send.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit(draft);
        }
    };

    const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Escape') onClose();
    };

    return (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Chat about this site" onKeyDown={onPanelKeyDown}>
            <div className="chat-header">
                <div className="chat-header-row">
                    <p className="chat-title">Ask about {scopedToPage ? 'this page' : 'this site'}</p>
                    <button type="button" className="chat-text-button" onClick={reset} disabled={turns.length === 0}>
                        New chat
                    </button>
                    <button type="button" className="chat-icon-button" onClick={onClose} aria-label="Close chat">
                        <CloseIcon />
                    </button>
                </div>
                {pageSlug !== undefined && (
                    <div className="chat-scope" role="radiogroup" aria-label="Search scope">
                        {(['page', 'site'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={scope === value}
                                className="chat-scope-option"
                                onClick={() => onScopeChange(value)}
                            >
                                {value === 'page' ? 'This page' : 'Whole site'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="chat-log" ref={log} onScroll={onScroll} aria-live="polite" aria-busy={streaming}>
                {turns.length === 0 ? (
                    <div className="chat-empty">
                        <p>
                            {scopedToPage
                                ? 'Ask a question about this page. Answers come from its content, with links to the sources.'
                                : 'Ask a question about the notes and portfolio on this site. Answers link to their sources.'}
                        </p>
                        <div className="chat-suggestions">
                            {(scopedToPage ? PAGE_SUGGESTIONS : SITE_SUGGESTIONS).map((suggestion) => (
                                <button key={suggestion} type="button" className="chat-suggestion" onClick={() => submit(suggestion)}>
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    turns.map((turn, i) => (
                        <TurnView
                            key={turn.id}
                            turn={turn}
                            scopedToPage={scopedToPage}
                            onRetry={i === turns.length - 1 ? retry : undefined}
                        />
                    ))
                )}
            </div>

            <form className="chat-form" onSubmit={onSubmit}>
                <textarea
                    ref={input}
                    className="chat-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Ask a question"
                    aria-label="Question"
                    rows={1}
                    maxLength={MAX_QUESTION_LENGTH}
                />
                {streaming ? (
                    <button type="button" className="chat-send" onClick={stop}>Stop</button>
                ) : (
                    <button type="submit" className="chat-send" disabled={draft.trim() === ''}>Send</button>
                )}
            </form>
            <p className="chat-disclaimer">AI-generated from this site&apos;s content. It can be wrong.</p>
        </section>
    );
}

function TurnView({ turn, scopedToPage, onRetry }: { turn: Turn; scopedToPage: boolean; onRetry?: () => void }) {
    if (turn.role === 'user') {
        return <div className="chat-turn chat-turn-user">{turn.content}</div>;
    }

    const waiting = turn.status === 'streaming' && turn.content === '';
    return (
        <div className="chat-turn chat-turn-assistant">
            {waiting && <p className="chat-status">Searching the site…</p>}
            {turn.content !== '' && (
                <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {linkCitationMarkers(turn.content, turn.citations)}
                    </ReactMarkdown>
                </div>
            )}
            {turn.status === 'stopped' && <p className="chat-status">Stopped.</p>}
            {turn.status === 'error' && (
                <p className="chat-status chat-error" role="alert">
                    {errorMessage(turn.errorCode ?? 'unknown', scopedToPage)}
                </p>
            )}
            {turn.citations.length > 0 && turn.status !== 'error' && (
                <ol className="chat-sources" aria-label="Sources">
                    {turn.citations.map((citation) => (
                        <li key={citation.slug}>
                            <Link href={citation.url}>{citation.title}</Link>
                        </li>
                    ))}
                </ol>
            )}
            {onRetry !== undefined && (turn.status === 'error' || turn.status === 'stopped') && (
                <button type="button" className="chat-text-button" onClick={onRetry}>Try again</button>
            )}
        </div>
    );
}

// Links in answers: site pages navigate in place (client-side, so a site-wide
// chat stays open), anything else opens in a new tab.
const MARKDOWN_COMPONENTS: Components = {
    a: ({ href, children }) => {
        if (href?.startsWith('/') && !href.startsWith('//')) return <Link href={href}>{children}</Link>;
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
};
