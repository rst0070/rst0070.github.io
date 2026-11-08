import { type ChangeEvent, useState } from 'react';
import type { Alternates, Lang } from '@/head';

const STORAGE_KEY = 'lang';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'ko', label: '한국어' },
];

/**
 * The nav language dropdown. Shows the page's language; picking one stores it
 * (the only writer of localStorage["lang"]) and goes to that language's
 * version of this page when it has one, else stays put.
 */
export function LangSwitcher({ lang, alternates }: { lang: Lang; alternates: Alternates }) {
  const [selected, setSelected] = useState<Lang>(lang);

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Lang;
    setSelected(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can throw in private mode; navigation still happens.
    }
    const target = alternates[next];
    if (next !== lang && target) window.location.assign(target);
  };

  return (
    <select
      aria-label="Language"
      value={selected}
      onChange={onChange}
      className="rounded-md bg-transparent py-1 px-1 m-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 cursor-pointer"
    >
      {OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
