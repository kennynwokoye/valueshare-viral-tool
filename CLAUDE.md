# ValueShare — Claude Code Instructions

## 🚨 DEPLOY: ALWAYS use `npm run deploy` — NEVER run netlify commands directly

```bash
npm run deploy   # ← THE ONLY safe way to deploy
```

**FORBIDDEN — these will break the live site:**
```bash
npx netlify deploy --no-build          # ← NEVER
npx netlify deploy --prod --no-build   # ← NEVER
npx netlify build && npx netlify deploy # ← NEVER
```

### Why
This is a Windows machine. `@netlify/plugin-nextjs` puts CSS/JS chunks in
`.netlify/static/_next/` but the deploy path is `.next/`. Without running
`node fix-paths-post-build.js`, those chunks are never uploaded → CSS 404s.

Also, `npx netlify build` swallows TypeScript errors and exits 0. Running
`npx next build` first (which `npm run deploy` does) catches TS errors before
they reach production and cause Netlify server function 404s.

### What `npm run deploy` does (deploy-all.js):
1. `npx next build` — **TYPE-CHECK GATE**: aborts on any TypeScript error
2. `npx netlify build` — generates server handler + edge functions
3. `node fix-paths-post-build.js` — copies `.netlify/static/` → `.next/_next/`
4. **VALIDATION GATE** — aborts if `.next/_next/static/chunks/*.css` missing
5. `npx netlify deploy --prod --no-build --skip-functions-cache`
6. `node purge-cache.js` — purges CDN for BOTH `valueshare.netlify.app` AND `valueshare.co`

---

## Stack
- Next.js 16.1.6 (App Router), Supabase, Tailwind CSS v4, TypeScript
- Deploy: Netlify (valueshare.co) — Site ID: `77f644a3-34b3-4a34-9a73-3d4eb8d59050`

## Supabase
- Project ref: `gffdynvrdcuttbiwezqf`
- Migrations: 001–013 (latest: `013_promo_materials.sql`)
- `CREATE POLICY IF NOT EXISTS` is invalid — use `DROP POLICY IF EXISTS` then `CREATE POLICY`
- Env vars must be `is_secret: false` — secret vars get masked during build

## Design System — "Warm Slate"
- Theme: `--vs-bg: #f4f3f0`, `--vs-accent: #e85d3a` (coral)
- Fonts: Cabinet Grotesk (Fontshare CDN), Lora (serif accents)
- CSS classes: `.vs-btn`, `.vs-input`, `.vs-card`, `.vs-label`
- Border-radius: 9px (buttons/inputs), 16px (cards)
