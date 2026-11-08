/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** The ai-backend Worker's URL, inlined at build time. Unset or empty: no chat widget. */
    readonly VITE_AI_API_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
