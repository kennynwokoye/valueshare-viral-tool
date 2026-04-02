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
        // Prevent ALL HTML pages from being cached in Netlify's Durable Cache.
        //
        // Root cause: @netlify/plugin-nextjs (headers.js) runs AFTER Next.js applies these
        // headers and checks `!headers.has("netlify-cdn-cache-control")`. If NOT set, it
        // appends `durable` to netlify-cdn-cache-control (e.g. "max-age=31536000, durable"),
        // which stores HTML in Netlify's 1-year Durable Cache. After a deploy, CDN serves
        // old HTML with old CSS chunk hashes → browser requests missing CSS → 404 → text/plain.
        //
        // Fix: Pre-set `Netlify-CDN-Cache-Control: no-store` so the plugin sees the header
        // already exists and skips ALL branches that add `durable`. The Durable Cache never
        // stores HTML. purge-cache.js clears the Edge CDN after every deploy.
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Netlify-CDN-Cache-Control', value: 'no-store' },
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
