import next from 'eslint-config-next'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'art-source/**', 'drizzle/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },
  ...next,
  {
    rules: {
      // Art is small pre-optimized WebP served as static files; next/image adds nothing here
      // and its <Image> cannot be used inside SVG/OG renders.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
