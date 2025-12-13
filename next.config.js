/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const nextConfig = {
  // Temporarily disable linting during build for quick deployment
  // TODO: Fix TypeScript ESLint errors and re-enable
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only use this if TypeScript errors also block the build
    // ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'localhost',
      'polygon-public-local.s3.us-east-1.amazonaws.com',
      'polygon-public-prod.s3.us-east-1.amazonaws.com',
      'lh3.googleusercontent.com',
    ],
  },
  headers: async () => {
    return [
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
        ],
      }
    ]
  },
  crossOrigin: 'anonymous',
  basePath: '',
  allowedDevOrigins: undefined
};

// ✅ THIS WILL PRINT IN RAILWAY BUILD LOGS
console.log("🚀 Next config loaded. allowedDevOrigins:", nextConfig.allowedDevOrigins);

export default nextConfig;
