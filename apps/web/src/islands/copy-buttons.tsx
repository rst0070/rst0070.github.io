import { useEffect } from 'react';

export function CopyButtons() {
    useEffect(() => {
        const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>('button.code-copy')
        );
        const cleanups: Array<() => void> = [];

        buttons.forEach(btn => {
            const handle = async () => {
                const figure = btn.closest('figure.code-block');
                const pre = figure?.querySelector('pre');
                const text = pre?.textContent ?? '';
                try {
                    await navigator.clipboard.writeText(text);
                    const original = btn.textContent;
                    btn.textContent = 'Copied';
                    btn.classList.add('code-copy-done');
                    setTimeout(() => {
                        btn.textContent = original;
                        btn.classList.remove('code-copy-done');
                    }, 1500);
                } catch (err) {
                    console.error('Copy failed:', err);
                }
            };
            btn.addEventListener('click', handle);
            cleanups.push(() => btn.removeEventListener('click', handle));
        });

        return () => cleanups.forEach(fn => fn());
    }, []);

    return null;
}
