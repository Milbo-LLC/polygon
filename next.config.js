/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const nextConfig = {
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
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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
        ],
      }
    ]
  },
  optimizeFonts: true,
  allowedDevOrigins: true,
};

export default nextConfig;
