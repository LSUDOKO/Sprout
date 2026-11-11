import next from 'eslint-config-next'

export default [
  { ignores: ['.next/**', 'node_modules/**', 'art-source/**', 'drizzle/**', 'playwright-report/**', 'test-results/**'] },
  ...next,
]
