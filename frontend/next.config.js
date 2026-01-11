import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost', 'api.hydraskript.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  },
}

export default nextConfig