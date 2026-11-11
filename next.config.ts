import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM + data files; keep it out of the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  images: { formats: ['image/webp'] },
}

export default nextConfig
