# cs-invoices

Invoicing for one company: clients, draft invoices, sequential invoice numbers, PDF download
and payment tracking. The PDF follows the company's GST export invoice format (GSTIN, HSN/SAC,
"without payment of IGST" statement, amount in words, bank details, signatory block).
Export invoices only for now: no CGST/SGST/IGST calculation. Password-protected.

Stack: Next.js 14 (App Router), Postgres (postgres.js), PDFKit. Deploys to Vercel.

## 1. Run locally

You need Node.js 20+ and Docker (for a local Postgres). No Docker? Use a free Neon database
instead and put its connection string in `.env.local`.

```
cp .env.example .env.local        # then edit ADMIN_PASSWORD and AUTH_SECRET
docker compose up -d              # starts Postgres on port 5432
npm install
npm run db:migrate                # creates the tables
npm run dev
```

Open http://localhost:3000 and sign in with your `ADMIN_PASSWORD`.

Generate a value for `AUTH_SECRET` with `openssl rand -hex 32`, or type any random string of
16+ characters.

## First-time setup in the app

1. Settings: fill in company name, address, GSTIN, state name and code, bank details, and the
   default HSN/SAC. Set "Next invoice number" to your last number plus one (for example 198).
2. Clients: add each buyer with address and country.
3. Invoices > New invoice: choose the buyer, currency, add lines, save the draft, then issue it.

## 2. Put the code on GitHub

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/cs-invoices.git
git push -u origin main
```

Create the empty `cs-invoices` repository on GitHub first (private is recommended).
`.env.local` is git-ignored, so your secrets are not uploaded.

After your first `npm install`, commit the generated `package-lock.json`, then change
`npm install` to `npm ci` in `.github/workflows/ci.yml`.

## 3. Deploy to Vercel

1. In Vercel choose Add New > Project, import the GitHub repo. The framework is detected as Next.js.
2. Add a Postgres database. Easiest: in the Vercel project open Storage and add Neon (or
   Supabase). This creates a database and sets connection variables for you.
3. Under Settings > Environment Variables make sure these exist for Production:
   - `DATABASE_URL`: the pooled Postgres connection string. If the integration named it
     differently (for example `POSTGRES_URL`), copy its value into `DATABASE_URL`.
   - `ADMIN_PASSWORD`: your login password.
   - `AUTH_SECRET`: a long random string.
4. Deploy. The build runs `npm run db:migrate` first, so tables are created automatically.
5. Open the Vercel URL, sign in, then fill in Settings (company name, payment details, prefix).

Preview deployments: every branch and pull request gets its own preview URL. Previews run
migrations too, so give the Preview environment a separate database (for example a Neon
branch). Do not point Preview at the production database.

## 4. Day-to-day workflow

```
git checkout -b feature/email-sending
# make changes, test locally
git push -u origin feature/email-sending   # opens a preview deployment, CI runs
# open a pull request on GitHub, review, merge to main
```

Merging to `main` deploys to production automatically. GitHub Actions (`.github/workflows/ci.yml`)
builds the app against a throwaway Postgres on every push and pull request.

### Changing the database

Never edit `db/migrations/001_init.sql` after it has been deployed. Add a new file instead:

```
db/migrations/002_add_invoice_po_number.sql
ALTER TABLE invoices ADD COLUMN po_number text NOT NULL DEFAULT '';
```

Migrations run once each, in file name order, on every deploy (and with `npm run db:migrate`).
Make additive changes where you can (add columns, add tables) so the previous version keeps
working while a deploy is in progress.

## How it works

- Amounts are stored as integers in minor units (cents, paise), never floats.
- Draft invoices can be edited. Issued invoices cannot; void them instead.
- Invoice numbers look like `CS/2026-27/198`: prefix (letters, numbers and dashes, for example `CS` or `CS-IN`), Indian financial year (April to March),
  then a running number that restarts each year. The number is assigned at issue time inside a
  transaction with a row lock, so there are no gaps or duplicates. In Settings you can set the
  next number so numbering continues from your existing sequence.
- A line with quantity 1 and no unit prints as a lump sum (only the amount), like the existing
  invoices. Add a quantity or unit to print Quantity, Rate and per columns.
- When an invoice is issued, client and company details are copied onto it, so later edits do
  not change old invoices.
- Login is a signed, HTTP-only cookie (7 days). Every page and the PDF route are protected.

## Project layout

```
db/migrations/         numbered SQL migrations
scripts/migrate.mjs    migration runner (also runs before every build)
src/middleware.js      redirects to /login when not signed in
src/lib/db.js          Postgres connection and queries
src/lib/auth.js        session signing
src/lib/pdf.js         PDF layout
src/app/actions.js     create, issue, pay, void (server actions)
src/app/...            pages
.github/workflows/     CI
```

## Known limits and next steps

- Login has no rate limiting. Fine for a private tool; add it (or Vercel's firewall rules)
  before sharing the URL widely.
- Back up the database. Neon and Supabase offer point-in-time recovery on paid tiers; on free
  tiers export with `pg_dump` periodically.
- Ideas: email sending, logo on the PDF, recurring invoices, credit notes, multiple users.

## Troubleshooting

- "DATABASE_URL is not set": create `.env.local` (local) or add the variable in Vercel.
- PDF fails on Vercel with a missing `.afm` font file: check that `next.config.mjs` still
  contains the `outputFileTracingIncludes` entry for the PDF route.
- Port 3000 busy: `npm run dev -- -p 3001`.
