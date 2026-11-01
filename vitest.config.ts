import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/worker.ts', 'src/engine/workerClient.ts', 'src/engine/types.ts'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
})
