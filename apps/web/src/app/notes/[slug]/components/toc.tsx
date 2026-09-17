'use client';

import { useEffect, useState } from 'react';
import { TocItem } from '@/infra/markdown';

export function Toc({ items }: { items: TocItem[] }) {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (items.length === 0) return;
        const headings = items
            .map(i => document.getElementById(i.id))
            .filter((el): el is HTMLElement => el !== null);

        if (headings.length === 0) return;

        // Pick the topmost heading currently inside the upper viewport band
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length === 0) return;
                const topMost = visible.reduce((a, b) =>
                    a.boundingClientRect.top < b.boundingClientRect.top ? a : b
                );
                setActiveId(topMost.target.id);
            },
            { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
        );

        headings.forEach(h => observer.observe(h));
        return () => observer.disconnect();
    }, [items]);

    if (items.length === 0) return null;

    return (
        <nav className="toc" aria-label="Table of contents">
            <p className="toc-label">On this page</p>
            <ul className="toc-list">
                {items.map(item => {
                    const cls = [
                        'toc-item',
                        `toc-level-${item.level}`,
                        activeId === item.id ? 'toc-active' : '',
                    ].filter(Boolean).join(' ');
                    return (
                        <li key={item.id} className={cls}>
                            <a href={`#${item.id}`}>{item.text}</a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
