import { Note } from "@/core/entities";
import { parseMarkdownToHtml, extractToc, estimateReadingMinutes } from "@/infra/markdown";
import { findAdjacentNotes } from "@/infra/note";
import { PostHeader } from "./post-header";
import { Toc } from "./toc";
import { PrevNext } from "./prev-next";

export async function NoteMdx({ note }: { note: Note }) {
    const { content, metadata, slug } = note;
    const html = await parseMarkdownToHtml(content);
    const toc = extractToc(html);
    const readingMinutes = estimateReadingMinutes(content);
    const { older, newer } = findAdjacentNotes(slug);

    return (
        <div className="post-layout">
            <article className="post-article">
                <PostHeader metadata={metadata} readingMinutes={readingMinutes} />
                <div className="prose post-body" dangerouslySetInnerHTML={{ __html: html }} />
                <PrevNext older={older} newer={newer} />
            </article>
            <aside className="post-toc-wrapper">
                <Toc items={toc} />
            </aside>
        </div>
    );
}
