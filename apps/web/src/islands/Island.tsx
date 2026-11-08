// The island marker: server HTML for one island, wrapped in an element that
// names it and carries its JSON-serializable props. Rendered at build time;
// entry-client hydrates the same component in place. `display: contents`
// keeps the wrapper out of the layout.
import { type ComponentType, createElement } from 'react'
import { ISLAND_ATTR, type IslandName, type IslandProps, PROPS_ATTR, islands, isIslandName } from './registry'

export function Island<N extends IslandName>({ name, props }: { name: N; props: IslandProps<N> }) {
    // The name type already rejects unknown islands; this catches a cast or a
    // plain-JS caller, and fails the prerender rather than skipping silently.
    if (!isIslandName(name)) throw new Error(`Unknown island "${String(name)}"`)
    const Component = islands[name] as ComponentType<object>
    return createElement(
        'div',
        { [ISLAND_ATTR]: name, [PROPS_ATTR]: JSON.stringify(props), style: { display: 'contents' } },
        createElement(Component, props as object),
    )
}
