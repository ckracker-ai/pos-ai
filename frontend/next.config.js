/** @type {import('next').NextConfig} */
const bffInternalUrl = (process.env.BFF_INTERNAL_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
);

const nextConfig = {
  // Habilita el empaquetado ultra-ligero y aislado para producción (Docker)
  output: 'standalone',

  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'api.example.com'],
  },

  // En dev, el navegador llama al mismo origen (p. ej. :80) y Next reenvía /api/* al BFF.
  // La ruta app/api/auth/login sigue resolviéndose en Next antes que el rewrite.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${bffInternalUrl}/api/:path*`,
      },
    ];
  },

  env: {
    // Vacío = URLs relativas (/api/...) vía rewrite. Para llamar al BFF directo: http://localhost:3000
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },

  async headers() {
    return [
      {
        // Match all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-internal-key, x-branch-id',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

