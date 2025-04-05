import { Note } from "@/core/entities";
import { parseMarkdownToHtml } from "@/infra/markdown";

export async function NoteMdx({ note }: { note: Note}) {
    const {content, metadata} = note
    
    return (
        <article className="prose">
            <h1 className="title font-semibold text-2xl tracking-tighter">{metadata.title}</h1>
            <div className="flex justify-between items-center mt-2 mb-8 text-sm">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Last Update: {metadata.date || metadata.lastmod}</p>
            </div>
            <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(content) }} />
        </article>
    )
}