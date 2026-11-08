import { readServerSentEvents } from './event-stream';

// Client for the ai-backend Worker's POST /chat (apps/ai-backend/ARCHITECTURE.md).

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface Citation {
    slug: string;
    title: string;
    url: string;
}

/**
 * A turn that failed. `code` is the Worker's error code (`no-source`,
 * `too-many-requests`, `quota-exhausted`, ...), or `network` / `interrupted`
 * for failures on the way.
 */
export class ChatRequestError extends Error {
    constructor(readonly code: string) {
        super(code);
        this.name = 'ChatRequestError';
    }
}

export interface StreamChatOptions {
    apiUrl: string;
    messages: ChatMessage[];
    /** Limits retrieval to one page (a note's slug, or `portfolio`). */
    slug?: string;
    signal: AbortSignal;
    onCitations: (citations: Citation[]) => void;
    onDelta: (text: string) => void;
}

/**
 * Sends one turn and streams the reply through the callbacks. Resolves when
 * the reply is complete; rejects with ChatRequestError, or with the abort
 * error when `signal` aborts.
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
    let response: Response;
    try {
        response = await fetch(new URL('/chat', options.apiUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body: JSON.stringify({ messages: options.messages, ...(options.slug === undefined ? {} : { slug: options.slug }) }),
            signal: options.signal,
        });
    } catch (error) {
        if (options.signal.aborted) throw error;
        throw new ChatRequestError('network');
    }

    if (!response.ok || response.body === null) {
        throw new ChatRequestError(await errorCode(response));
    }

    try {
        for await (const { event, data } of readServerSentEvents(response.body)) {
            if (event === 'citations') options.onCitations((JSON.parse(data) as { citations: Citation[] }).citations);
            else if (event === 'delta') options.onDelta((JSON.parse(data) as { text: string }).text);
            else if (event === 'done') return;
            else if (event === 'error') throw new ChatRequestError((JSON.parse(data) as { error: string }).error);
        }
    } catch (error) {
        if (options.signal.aborted || error instanceof ChatRequestError) throw error;
        throw new ChatRequestError('interrupted');
    }
    throw new ChatRequestError('interrupted');
}

async function errorCode(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string') return body.error;
    } catch {
        // Not a JSON error from the Worker (a proxy or platform error page).
    }
    return `http-${response.status}`;
}
