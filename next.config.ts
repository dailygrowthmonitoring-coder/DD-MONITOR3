import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent Next.js bundler from trying to bundle pino/pino-pretty.
  // Pino uses thread-stream workers and native bindings that must be loaded
  // by Node.js directly, not by the webpack bundler.
  serverExternalPackages: ['pino', 'pino-pretty'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

export default nextConfig
