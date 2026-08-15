# Deploying Artisan Cabinets (Railway + Postgres)

One-time setup to put the app online with HTTPS and a real database. Steps marked
**[you]** need your account/login; **[me]** are things Claude does once the
`DATABASE_URL` exists.

## 1. Create the host — [you]

1. Go to **railway.app** and sign up (GitHub login is easiest — it can see this repo).
2. **New Project → Deploy from GitHub repo → `jackyke73/artisan-cabinets`.**
3. In the same project: **New → Database → Add PostgreSQL.** Railway provisions it
   and exposes a `DATABASE_URL` variable automatically.
4. On the app service → **Settings → Build**, set:
   - Build command: `npm run build`  (runs `prisma generate && next build`)
   - Start command: `npm run start:prod`  (runs `prisma migrate deploy && next start`)
5. On the app service → **Variables**, add the env vars in section 2, then reference
   the Postgres `DATABASE_URL` (Railway can link it with a `${{Postgres.DATABASE_URL}}`
   reference).
6. **Settings → Networking → Generate Domain** to get an HTTPS URL
   (e.g. `artisan-cabinets-production.up.railway.app`).

Then paste me the generated domain and confirm the Postgres is attached — I take it
from there.

## 2. Environment variables

| Variable | Value | When |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference) | now |
| `APP_PASSWORD` | a shared office password | now |
| `APP_ENCRYPTION_KEY` | 64-hex string — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | now |
| `QBO_ENV` | `sandbox` at first, `production` after Intuit approval | now / later |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` | sandbox keys now; production keys after approval | now / later |
| `QBO_REDIRECT_URI` | `https://<your-railway-domain>/api/qbo/callback` | after domain exists |
| `ANTHROPIC_API_KEY` | optional — enables the AI match fallback | optional |

## 3. Database + catalog — [me]

Once `DATABASE_URL` is live:
1. Flip `prisma/schema.prisma` provider `sqlite → postgresql`.
2. Create the initial migration and run `prisma migrate deploy` (the start command
   does this automatically on every deploy).
3. Import the real catalog into the production DB (`npm run import:master` pointed at
   the prod `DATABASE_URL`) — the database isn't in git, so prod starts empty.

## 4. QuickBooks production — [you submit, me draft]

The redirect URI for production must be the HTTPS Railway domain, registered under the
Intuit app's **Production** redirect URIs. Production keys require Intuit's app
assessment, which uses these already-built public URLs:
- Terms / EULA: `https://<domain>/legal/terms`
- Privacy: `https://<domain>/legal/privacy`

Fill in the bracketed placeholders on those pages first. After Intuit approves, set
`QBO_ENV=production` + the production keys, clear the sandbox `qbo*` id mappings, and
reconnect against your real company.

## 5. Go-live checklist

- [ ] `APP_PASSWORD` set (app requires login)
- [ ] `APP_ENCRYPTION_KEY` set (QuickBooks tokens encrypted at rest)
- [ ] Correct price level loaded in the catalog
- [ ] One real quote pushed to QuickBooks and verified, then deleted
