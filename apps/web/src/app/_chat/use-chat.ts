'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, ChatRequestError, Citation, streamChat } from './chat-api';

export type Turn =
    | { id: number; role: 'user'; content: string }
    | {
        id: number;
        role: 'assistant';
        content: string;
        citations: Citation[];
        status: 'streaming' | 'done' | 'stopped' | 'error';
        /** ChatRequestError code when status is `error`. */
        errorCode?: string;
    };

// The Worker keeps only the last few messages and accepts at most 50; sending
// a bounded tail keeps long chats valid without duplicating its window policy.
const MAX_SENT_MESSAGES = 20;

/**
 * A chat held in memory. Every turn sends the conversation so far; nothing is
 * stored, so unmounting (or a reload) starts over. `slug` limits retrieval to
 * one page.
 */
export function useChat(apiUrl: string, slug: string | undefined): Chat {
    const [turns, setTurns] = useState<Turn[]>([]);
    const controller = useRef<AbortController | null>(null);
    const nextId = useRef(0);

    useEffect(() => () => controller.current?.abort(), []);

    const updateLast = useCallback((update: (turn: Extract<Turn, { role: 'assistant' }>) => Partial<Turn>) => {
        setTurns((previous) => {
            const last = previous.at(-1);
            if (last === undefined || last.role !== 'assistant') return previous;
            return [...previous.slice(0, -1), { ...last, ...update(last) } as Turn];
        });
    }, []);

    const run = useCallback(async (history: Turn[]) => {
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;

        const reply: Turn = { id: nextId.current++, role: 'assistant', content: '', citations: [], status: 'streaming' };
        setTurns([...history, reply]);

        try {
            await streamChat({
                apiUrl,
                messages: toMessages(history),
                slug,
                signal: current.signal,
                onCitations: (citations) => updateLast(() => ({ citations })),
                onDelta: (text) => updateLast((last) => ({ content: last.content + text })),
            });
            updateLast(() => ({ status: 'done' }));
        } catch (error) {
            if (current.signal.aborted) {
                updateLast(() => ({ status: 'stopped' }));
            } else {
                const errorCode = error instanceof ChatRequestError ? error.code : 'unknown';
                updateLast(() => ({ status: 'error', errorCode }));
            }
        } finally {
            if (controller.current === current) controller.current = null;
        }
    }, [apiUrl, slug, updateLast]);

    const send = useCallback((text: string) => {
        const content = text.trim();
        if (content === '') return;
        void run([...settled(turns), { id: nextId.current++, role: 'user', content }]);
    }, [run, turns]);

    /** Asks the last question again, replacing its failed or stopped answer. */
    const retry = useCallback(() => {
        const history = settled(turns);
        if (history.at(-1)?.role === 'assistant') history.pop();
        if (history.at(-1)?.role === 'user') void run(history);
    }, [run, turns]);

    const stop = useCallback(() => controller.current?.abort(), []);

    const reset = useCallback(() => {
        controller.current?.abort();
        setTurns([]);
    }, []);

    const last = turns.at(-1);
    const streaming = last?.role === 'assistant' && last.status === 'streaming';
    return useMemo(() => ({ turns, streaming, send, retry, stop, reset }), [turns, streaming, send, retry, stop, reset]);
}

export interface Chat {
    turns: Turn[];
    /** An answer is being generated. */
    streaming: boolean;
    send: (text: string) => void;
    retry: () => void;
    stop: () => void;
    reset: () => void;
}

/** The conversation without an answer still being generated. */
function settled(turns: Turn[]): Turn[] {
    return turns.filter((turn) => turn.role === 'user' || turn.status !== 'streaming');
}

/** What the Worker sees: questions, and answers that produced text. */
function toMessages(turns: Turn[]): ChatMessage[] {
    return turns
        .filter((turn) => turn.role === 'user' || turn.content.trim() !== '')
        .map((turn) => ({ role: turn.role, content: turn.content }))
        .slice(-MAX_SENT_MESSAGES);
}
