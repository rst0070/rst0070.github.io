'use client';

import { useEffect, useState } from 'react';

export function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const update = () => {
            const el = document.documentElement;
            const total = el.scrollHeight - el.clientHeight;
            const pct = total > 0 ? (el.scrollTop / total) * 100 : 0;
            setProgress(pct);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    return (
        <div
            className="reading-progress"
            style={{ transform: `scaleX(${progress / 100})` }}
            aria-hidden="true"
        />
    );
}
