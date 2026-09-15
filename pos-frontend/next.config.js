/** @type {import('next').NextConfig} */
const proxyPrefix = '/pos/proxy';

const nextConfig = {
  output: 'standalone',

  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'api.example.com'],
  },

  // Browser → mismo origen (:8010) → App Router proxy → BFF (:2020) /pos/proxy/*
  // (route.ts reenvía Set-Cookie HttpOnly; no usar rewrite que puede perder cookies)

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },

  async headers() {
    return [
      {
        source: `${proxyPrefix}/:path*`,
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8010' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-branch-id',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
