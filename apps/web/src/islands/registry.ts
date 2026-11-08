// The closed set of islands: the only components the client mounts. The
// server emits a marker naming one of these (see Island.tsx); entry-client
// mounts the named component there and nowhere else.
import type { ComponentType } from 'react'
import { ChatWidget } from './chat/chat-widget'
import { CopyButtons } from './copy-buttons'
import { LangSwitcher } from './lang-switcher'
import { MermaidFullscreen } from './mermaid-fullscreen'
import { NoteScripts } from './note-scripts'
import { ReadingProgress } from './reading-progress'
import { ThemeToggle } from './theme-toggle'
import { Toc } from './toc'

export const islands = {
    'theme-toggle': ThemeToggle,
    'lang-switcher': LangSwitcher,
    'toc': Toc,
    'reading-progress': ReadingProgress,
    'copy-buttons': CopyButtons,
    'note-scripts': NoteScripts,
    'mermaid-fullscreen': MermaidFullscreen,
    'chat': ChatWidget,
} satisfies Record<string, ComponentType<any>>

export type IslandName = keyof typeof islands
export type IslandProps<N extends IslandName> = Parameters<(typeof islands)[N]>[0] extends undefined
    ? Record<string, never>
    : Parameters<(typeof islands)[N]>[0]

export const ISLAND_ATTR = 'data-island'
export const PROPS_ATTR = 'data-props'

export function isIslandName(name: string): name is IslandName {
    return Object.prototype.hasOwnProperty.call(islands, name)
}
