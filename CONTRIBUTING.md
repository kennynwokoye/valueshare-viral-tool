# Contributing to ValueShare Viral Tool

Thank you for considering a contribution. The goal of this project is to keep referral-gated content sharing simple, self-hostable, and useful for creators and educators.

## How to contribute

1. Open an issue describing the bug, improvement, or feature idea.
2. Fork the repository and create a focused branch.
3. Keep changes small and reviewable.
4. Include screenshots or reproduction steps for UI changes and bugs.
5. Submit a pull request with a clear summary and testing notes.

## Pull request checklist

- The change has a clear purpose.
- The app still starts locally with `npm run dev`.
- No secrets, API keys, `.env` files, or private customer data are included.
- UI changes are responsive on mobile and desktop.
- Database or auth changes include a short explanation of security impact.

## Maintainer review focus

Maintainer review prioritizes:

- Referral and unlock logic correctness
- Abuse prevention and duplicate-click handling
- Accessibility and mobile usability
- Safe handling of Supabase keys and policies
- Clear documentation for non-technical operators
