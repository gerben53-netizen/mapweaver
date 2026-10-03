import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['service/**/*.test.ts'], environment: 'node', fileParallelism:false } })
