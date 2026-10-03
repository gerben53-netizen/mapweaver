import { defineConfig } from 'vite'
export default defineConfig({ build: { ssr: 'service/main.ts', outDir: 'dist-service', target:'node22', rolldownOptions: { output: { entryFileNames:'main.js' } } } })
