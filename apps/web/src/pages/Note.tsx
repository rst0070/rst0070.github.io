import type { Note as NoteEntity } from "@rst0070/content";
import type { TocItem } from "@/infra/markdown";
import { PostHeader } from "./note/post-header";
import { Toc } from "./note/toc";
import { PrevNext } from "./note/prev-next";
import { ReadingProgress } from "./note/reading-progress";
import { NoteScripts } from "./note/note-scripts";

export type NoteData = {
    note: NoteEntity;
    description: string;
    /** The note body, already rendered by the markdown pipeline at build time. */
    html: string;
    toc: TocItem[];
    readingMinutes: number;
    older: NoteEntity | null;
    newer: NoteEntity | null;
};

export function Note({ data }: { data: NoteData }) {
    const { note, html, toc, readingMinutes, older, newer } = data;

    return (
        <>
            <ReadingProgress />
            <div className="post-layout">
                <article className="post-article">
                    <PostHeader metadata={note.metadata} readingMinutes={readingMinutes} />
                    <div className="prose post-body" dangerouslySetInnerHTML={{ __html: html }} />
                    <PrevNext older={older} newer={newer} />
                </article>
                <aside className="post-toc-wrapper">
                    <Toc items={toc} />
                </aside>
            </div>
            <NoteScripts />
        </>
    );
}
