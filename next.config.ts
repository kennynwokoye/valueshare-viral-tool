import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  async headers() {
    return [
      {
        // Prevent ALL HTML pages from being cached by browser or Netlify Durable Cache.
        // Without this, @netlify/plugin-nextjs stores pages in a ~1-year Durable Cache
        // that our purge-cache.js doesn't touch, so after a deploy the CDN serves old
        // HTML with old CSS chunk hashes → browser requests missing CSS → unstyled page.
        // no-store = never cache, always fetch fresh from origin.
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/w/:key*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ]
  },
};

export default nextConfig;
