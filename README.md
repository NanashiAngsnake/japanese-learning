# Japanese grammar SRS

Web app for learning Japanese grammar with spaced repetition. Users review
grammar points as fill-in-the-blank sentences, and the app schedules the next
review from their answers.

The grammar content itself is not included in this repository.

## Features

- Accounts with user and admin roles (NextAuth).
- SM-2 based scheduling, with cloze exercises and answer checking (kana or rōmaji input).
- Pro subscription with Stripe Checkout and webhooks; a limited set of free points.
- Progress dashboard, public profiles, leaderboard and badges.
- Admin panel to edit grammar points and manage users.

## Stack

Next.js 16 (App Router), TypeScript, Prisma with SQLite, NextAuth, Tailwind CSS, Stripe.

## Getting started

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Fill in `.env` with your own keys. Without Stripe keys, checkout runs in a
local demo mode.

## License

All rights reserved. Published as a portfolio for viewing and evaluation only;
reuse or redistribution is not permitted. See [LICENSE](LICENSE).
