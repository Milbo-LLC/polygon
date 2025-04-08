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
  experimental: {
    // This disables the strict check for Suspense boundaries with CSR
    missingSuspenseWithCSRBailout: true
  }
};

export default nextConfig;
