/**
 * The `data` of each event in a server-sent event stream, in order. Multi-line
 * data is joined with `\n`; comments and other fields are skipped. Returning
 * early (the consumer stops) cancels the underlying stream.
 */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let data: string[] = []
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += value
            let newline: number
            while ((newline = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newline).replace(/\r$/, '')
                buffer = buffer.slice(newline + 1)
                if (line === '') {
                    if (data.length > 0) yield data.join('\n')
                    data = []
                } else if (line.startsWith('data:')) {
                    data.push(line.slice(line[5] === ' ' ? 6 : 5))
                }
            }
        }
        if (buffer.startsWith('data:')) data.push(buffer.slice(buffer[5] === ' ' ? 6 : 5))
        if (data.length > 0) yield data.join('\n')
    } finally {
        // A no-op once the stream is done; otherwise stops the upstream response.
        await reader.cancel().catch(() => {})
    }
}
