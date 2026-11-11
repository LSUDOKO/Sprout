import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Don't let `next dev` write an AGENTS.md into the repo.
  agentRules: false,
  // PGlite ships WASM + data files; keep it out of the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  images: { formats: ['image/webp'] },
}

export default nextConfig
