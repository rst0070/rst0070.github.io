import { DiContainer } from './diContainer'
import { route } from './http/router'

// Worker entry: the only place that reads bindings and secrets from `env`.
export default {
    fetch(request, env) {
        const container = new DiContainer({
            ai: env.AI,
            vectorize: env.VECTORIZE,
            reindexSecret: env.REINDEX_SECRET,
        })
        return route(request, container)
    },
} satisfies ExportedHandler<Env>
