import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatRequestError, streamChat } from '../chat-api';

const citations = [{ slug: 'a', title: 'A', url: '/notes/a' }];

function eventStream(...events: [string, unknown][]): Response {
    const body = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

async function run(response: Response | (() => Promise<Response>), slug?: string) {
    const fetchMock = vi.fn(typeof response === 'function' ? response : async () => response);
    vi.stubGlobal('fetch', fetchMock);
    const received: { citations: unknown[]; deltas: string[] } = { citations: [], deltas: [] };
    const result = streamChat({
        apiUrl: 'https://ai.example',
        messages: [{ role: 'user', content: 'hi' }],
        slug,
        signal: new AbortController().signal,
        onCitations: (value) => received.citations.push(value),
        onDelta: (text) => received.deltas.push(text),
    });
    return { fetchMock, received, result };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('streamChat', () => {
    it('posts the conversation and streams citations then deltas', async () => {
        const { fetchMock, received, result } = await run(eventStream(['citations', { citations }], ['delta', { text: 'Hel' }], ['delta', { text: 'lo' }], ['done', {}]), 'a');

        await expect(result).resolves.toBeUndefined();
        expect(received).toEqual({ citations: [citations], deltas: ['Hel', 'lo'] });
        const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
        expect(String(url)).toBe('https://ai.example/chat');
        expect(init.headers).toMatchObject({ Accept: 'text/event-stream' });
        expect(JSON.parse(init.body as string)).toEqual({ messages: [{ role: 'user', content: 'hi' }], slug: 'a' });
    });

    it('rejects with the Worker\'s error code', async () => {
        const { result } = await run(Response.json({ error: 'too-many-requests' }, { status: 429 }));
        await expect(result).rejects.toEqual(new ChatRequestError('too-many-requests'));
    });

    it('rejects with the code of an error event, keeping text already streamed', async () => {
        const { received, result } = await run(eventStream(['citations', { citations }], ['delta', { text: 'Part' }], ['error', { error: 'unknown' }]));

        await expect(result).rejects.toEqual(new ChatRequestError('unknown'));
        expect(received.deltas).toEqual(['Part']);
    });

    it('distinguishes a stream that ends early, a non-JSON error and a network failure', async () => {
        await expect((await run(eventStream(['delta', { text: 'x' }]))).result).rejects.toEqual(new ChatRequestError('interrupted'));
        await expect((await run(new Response('Bad gateway', { status: 502 }))).result).rejects.toEqual(new ChatRequestError('http-502'));
        await expect((await run(async () => { throw new TypeError('Failed to fetch'); })).result).rejects.toEqual(new ChatRequestError('network'));
    });
});
