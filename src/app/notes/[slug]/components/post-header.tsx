import { NoteMetadata } from "@/core/entities";

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function parseTags(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(",").map(t => t.trim()).filter(Boolean);
}

export function PostHeader({
    metadata,
    readingMinutes,
}: {
    metadata: NoteMetadata;
    readingMinutes: number;
}) {
    const dateRaw = metadata.date || metadata.lastmod;
    const tags = parseTags(metadata.tags);
    const hasMeta = dateRaw || readingMinutes > 0;

    return (
        <header className="post-header">
            <h1 className="post-title">{metadata.title}</h1>
            {metadata.description && (
                <p className="post-description">{metadata.description}</p>
            )}
            {hasMeta && (
                <div className="post-meta">
                    {dateRaw && <span>{formatDate(dateRaw)}</span>}
                    {dateRaw && <span aria-hidden="true">·</span>}
                    <span>{readingMinutes} min read</span>
                </div>
            )}
            {tags.length > 0 && (
                <ul className="post-tags">
                    {tags.map(tag => (
                        <li key={tag} className="post-tag">{tag}</li>
                    ))}
                </ul>
            )}
        </header>
    );
}
