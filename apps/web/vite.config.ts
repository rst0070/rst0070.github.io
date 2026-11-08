import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The client build: index.html (the document template every page is written
// into) and the browser entry it loads. Pages themselves are rendered by
// scripts/prerender.ts, which loads src/entry-server.tsx through Vite.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
})
