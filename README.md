# ZOL

ZOL is an AI-powered operating system for automotive repair shops. This MVP connects scheduling, check-in, repair orders, AI-assisted diagnostics, digital inspections, estimates, customer approval, parts, repair, invoicing, payment, messaging, and CRM.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Auth.js credentials authentication with owner, manager, technician, and customer roles
- Prisma ORM with portable PostgreSQL schema and migrations
- Google Cloud SQL for PostgreSQL target
- OpenAI server-side structured assistance with deterministic fallbacks
- Stripe test payments with a labeled demo provider fallback

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and configure `DATABASE_URL`, `DIRECT_URL`, and auth secrets. Both database URLs must target PostgreSQL. Add `sslmode=require` for Cloud SQL connections that require TLS.

3. Initialize the database:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Start ZOL:

   ```bash
   npm run dev
   ```

Open http://localhost:3000.

## Demo accounts

All seeded accounts use password `ZolDemo123!`.

- Owner: `owner@zol.demo`
- Manager: `manager@zol.demo`
- Technician: `tech@zol.demo`
- Customer: `customer@zol.demo`

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Integration behavior

- Without `OPENAI_API_KEY`, diagnostics, inspection summaries, estimates, receptionist, and follow-ups use safe, clearly constrained fallback behavior.
- Without Stripe keys, payment uses a labeled demo payment and still persists the payment, closes the repair order, and creates CRM follow-up.
- Messaging uses the mock provider while persisting message history.
- The storage interface is ready for a Google Cloud Storage adapter; the demo adapter returns local-style URLs.

Never commit `.env.local`, credentials, service-account files, or API keys.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
