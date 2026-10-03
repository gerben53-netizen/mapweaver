import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Browser traces contain HTML; writing them must not reload the application under test.
  server: { proxy: { '/api/v1': { target: `http://127.0.0.1:${process.env.MAPWEAVER_PORT || 47831}`, changeOrigin: true } }, watch: { ignored: ['**/.sprint12.local/**', '**/.audit.local/**', '**/.qa.local/**', '**/.npm-cache/**'] } },
  build: { rolldownOptions: { output: { codeSplitting: {
    includeDependenciesRecursively: false,
    groups: [
      { name: 'react', test: /node_modules[\\/](react|react-dom|react-reconciler|scheduler)[\\/]/ },
      { name: 'canvas', test: /node_modules[\\/](konva|react-konva)[\\/]/ },
      { name: 'storage', test: /node_modules[\\/](dexie|fflate)[\\/]/ },
    ],
  } } } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
