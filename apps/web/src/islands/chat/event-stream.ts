export interface ServerSentEvent {
    event: string;
    data: string;
}

/**
 * Server-sent events from a response body, in order. Multi-line data is joined
 * with `\n`; comments and other fields are skipped. Stopping early cancels the
 * body, which closes the connection.
 */
export async function* readServerSentEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerSentEvent> {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let event = 'message';
    let data: string[] = [];

    function* line(text: string): Generator<ServerSentEvent> {
        if (text === '') {
            if (data.length > 0) yield { event, data: data.join('\n') };
            event = 'message';
            data = [];
            return;
        }
        const colon = text.indexOf(':');
        if (colon === 0) return;
        const field = colon === -1 ? text : text.slice(0, colon);
        const value = colon === -1 ? '' : text.slice(text[colon + 1] === ' ' ? colon + 2 : colon + 1);
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
    }

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += value;
            let newline: number;
            while ((newline = buffer.indexOf('\n')) !== -1) {
                yield* line(buffer.slice(0, newline).replace(/\r$/, ''));
                buffer = buffer.slice(newline + 1);
            }
        }
        if (buffer !== '') yield* line(buffer);
        yield* line('');
    } finally {
        await reader.cancel().catch(() => {});
    }
}
