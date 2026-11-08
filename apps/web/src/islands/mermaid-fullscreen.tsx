import { useEffect } from 'react';

export function MermaidFullscreen() {
    useEffect(() => {
        const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>('button.mermaid-fullscreen')
        );
        const cleanups: Array<() => void> = [];

        buttons.forEach(btn => {
            const handle = () => {
                btn.closest('figure.mermaid-block')?.classList.toggle('mermaid-expanded');
            };
            btn.addEventListener('click', handle);
            cleanups.push(() => btn.removeEventListener('click', handle));
        });

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            document
                .querySelectorAll('figure.mermaid-block.mermaid-expanded')
                .forEach(el => el.classList.remove('mermaid-expanded'));
        };
        document.addEventListener('keydown', onKey);
        cleanups.push(() => document.removeEventListener('keydown', onKey));

        return () => cleanups.forEach(fn => fn());
    }, []);

    return null;
}
