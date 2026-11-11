import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside the react-server condition; it's a no-op in tests.
      'server-only': fileURLToPath(new URL('./tests/server-only-stub.ts', import.meta.url)),
    },
  },
  test: { include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'], environment: 'node', testTimeout: 30000, fileParallelism: false },
})
