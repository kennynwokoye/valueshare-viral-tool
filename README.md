# ValueShare Viral Tool

ValueShare is an open-source referral-gated content sharing tool for creators, educators, and community operators. It lets a user unlock valuable content after their referral link generates a defined number of unique visits.

The project is built for practical creator and education workflows where distribution matters as much as content delivery. A coach, course creator, newsletter owner, or community manager can publish a lead magnet, give every participant a referral link, and unlock the resource once the participant helps spread it.

## Why this exists

Many creators and small education businesses need simple viral loops, but most referral tools are either paid SaaS products, too heavy for small campaigns, or not flexible enough for local market needs. ValueShare is intended to be a transparent, self-hostable alternative that developers can adapt for their own communities.

## Core features

- Referral link generation for each participant
- Unique-click tracking for unlock thresholds
- Content unlock flow for ebooks, videos, links, or course resources
- Campaign management workflow
- TypeScript and Next.js frontend
- Supabase/PostgreSQL-backed data model
- Lightweight deployment path for small teams

## Maintainer workflows

This repository is maintained by Kenny Nwokoye. Current maintenance work includes:

- Reviewing and improving campaign, referral, and unlock logic
- Tracking issues and feature requests from creator and education use cases
- Keeping the project deployable for self-hosted and small-team environments
- Improving documentation so other operators can adapt it
- Using AI coding tools for triage, refactoring, security checks, and release-readiness review

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Node.js tooling

## Getting started

```bash
git clone https://github.com/kennynwokoye/valueshare-viral-tool.git
cd valueshare-viral-tool
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment variables

Create a local `.env.local` file based on the variables used in the app. Do not commit secrets.

Typical values may include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow.

Good first contribution areas:

- Improve setup documentation
- Add tests around referral and unlock logic
- Improve accessibility and mobile UI
- Add deployment guides
- Review database policies and security rules

## Security

If you find a vulnerability, please follow [SECURITY.md](./SECURITY.md). Do not publish exploitable details in a public issue before the maintainer has had time to review.

## License

MIT. See [LICENSE](./LICENSE).
