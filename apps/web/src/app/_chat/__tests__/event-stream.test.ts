import { describe, expect, it } from 'vitest';
import { readServerSentEvents } from '../event-stream';

function byteStream(text: string, size: number): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    let offset = 0;
    return new ReadableStream({
        pull(controller) {
            if (offset >= bytes.length) return controller.close();
            controller.enqueue(bytes.slice(offset, offset + size));
            offset += size;
        },
    });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of iterable) items.push(item);
    return items;
}

describe('readServerSentEvents', () => {
    it('reads named events across arbitrary byte boundaries', async () => {
        const text = [
            'event: citations\ndata: {"citations":[]}\n\n',
            ': keep-alive\n\n',
            'event: delta\r\ndata: {"text":"안녕하세요"}\r\n\r\n',
            'data: line 1\ndata: line 2\n\n',
            'event: done\ndata: {}',
        ].join('');

        for (const size of [1, 3, 64]) {
            expect(await collect(readServerSentEvents(byteStream(text, size)))).toEqual([
                { event: 'citations', data: '{"citations":[]}' },
                { event: 'delta', data: '{"text":"안녕하세요"}' },
                { event: 'message', data: 'line 1\nline 2' },
                { event: 'done', data: '{}' },
            ]);
        }
    });
});
