import { DiContainer } from './diContainer'
import { route } from './http/router'

// Worker entry: the only place that reads bindings and secrets from `env`.
export default {
    fetch(request, env) {
        const container = new DiContainer({
            ai: env.AI,
            vectorize: env.VECTORIZE,
            chatRateLimiter: env.CHAT_RATE_LIMITER,
            reindexSecret: env.REINDEX_SECRET,
            allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter((origin) => origin !== ''),
        })
        return route(request, container)
    },
} satisfies ExportedHandler<Env>
