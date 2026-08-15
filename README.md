# Artisan Cabinets — Smart Quote Builder

Paste a customer's request, auto-match their shorthand cabinet codes (e.g. `B15`)
to your real catalog SKUs (`BPS-B15`) with prices, correct the uncertain few, and
export a quote PDF. The tool **learns from every correction**, so it gets faster
and more accurate the more you use it — the durable edge over QuickBooks' static AI.

**Phase 1** (catalog import, deterministic matching, quote builder, alias learning,
PDF export) and **Phase 2** (AI fallback for ambiguous lines, quote list/search,
customer reuse, a login gate) are built. QuickBooks and email ingestion are Phase 3.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma + SQLite · Tailwind · Zod ·
Fuse.js / string-similarity (matching) · SheetJS (import) · @react-pdf/renderer (export).

## Getting started

```bash
npm install
npm run db:push      # create the SQLite database from the schema
npm run db:seed      # load 3 sample door styles + 50 catalog items
npm run dev          # http://localhost:3000
```

Then:

1. **Import your catalog** at `/catalog/import` (`.xlsx` or `.csv`). Map the SKU,
   description, and price columns (auto-guessed), optionally derive style + size
   from the SKU, and commit. Merge mode never deletes existing items.
2. **Build a quote** at `/quotes/new`: pick a door style, paste the request, hit
   **Parse & Match**, fix any yellow/red rows via the SKU picker, then **Confirm**.
   Each confirmed correction is remembered.
3. **Export** the quote to PDF from the quote page.

## How matching works (`src/lib/matching/`)

Deterministic-first, scoped to the chosen style, so it's fast, offline, and
auditable:

1. **Alias** — a learned `shorthand → SKU` mapping (grows with every confirmation).
2. **Exact** — normalized SKU, or a size code within the chosen style
   (`B15` under `BPS` → `BPS-B15`).
3. **Fuzzy** — Dice-bigram similarity on the code, Fuse.js on descriptions;
   surfaces ranked candidates but never auto-binds a low-confidence guess.

Confidence gates the UI: ≥90% auto-accepts (green), 60–90% needs review (yellow),
below that is flagged (red). A quote can't be confirmed with unresolved red rows
without an explicit override. Line items snapshot price + description, so a later
catalog re-import never changes an existing quote.

## Scripts

```bash
npm run test     # unit tests for the matching engine (parser, exact, fuzzy, gating)
npm run verify   # runtime regression check against the seeded DB (matching + alias)
npm run build    # production build (also typechecks everything)
```

## Configuration (optional)

Set these in `.env` (see `.env.example`):

- **`ANTHROPIC_API_KEY`** — turns on the AI fallback: when the deterministic
  stages can't confidently match a line, Claude ranks the candidate SKUs (it can
  never invent one). Off by default; the tool runs fully offline without it.
  `MATCH_LLM_MODEL` overrides the model (default `claude-haiku-4-5`).
- **`APP_PASSWORD`** — require a shared password to use the app. Unset = open
  (fine for a single local machine).

## QuickBooks Online (Phase 3)

Push a saved quote to QuickBooks as an **Estimate** (no more double-entry). Setup:

1. Create an app at **developer.intuit.com** ("QuickBooks Online and Payments").
2. Add the redirect URI `http://localhost:3000/api/qbo/callback` to the app.
3. Put the Development (sandbox) keys in `.env` as `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET`.
4. Open the **QuickBooks** tab → **Connect to QuickBooks** → approve in your sandbox.
5. On any confirmed quote, click **Push to QuickBooks**. It matches (or creates)
   the customer and items, creates the Estimate, and records the ids so re-pushes
   and future quotes reuse them. Flip `QBO_ENV="production"` + production keys to go live.

Code lives in `src/lib/qbo/` (config, OAuth, API client, push). The push runs
against the QuickBooks API, so verify it in the sandbox before production.

## Roadmap

- **Phase 2** *(done)* — AI fallback, quote list/search, customer reuse, login gate.
- **Phase 3** — QuickBooks Estimate push *(built; verify in sandbox)*; next:
  email-inbox ingestion, invoices + inventory, SQLite → Postgres.
