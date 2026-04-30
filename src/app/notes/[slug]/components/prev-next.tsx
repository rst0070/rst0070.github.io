import Link from 'next/link';
import { Note } from '@/core/entities';

export function PrevNext({ older, newer }: { older: Note | null; newer: Note | null }) {
    if (!older && !newer) return null;
    return (
        <nav className="prev-next" aria-label="Adjacent posts">
            {older ? (
                <Link href={`/notes/${older.slug}`} className="prev-next-card prev-next-older">
                    <span className="prev-next-label">← Older</span>
                    <span className="prev-next-title">{older.metadata.title}</span>
                </Link>
            ) : <span className="prev-next-spacer" aria-hidden="true" />}
            {newer ? (
                <Link href={`/notes/${newer.slug}`} className="prev-next-card prev-next-newer">
                    <span className="prev-next-label">Newer →</span>
                    <span className="prev-next-title">{newer.metadata.title}</span>
                </Link>
            ) : <span className="prev-next-spacer" aria-hidden="true" />}
        </nav>
    );
}
