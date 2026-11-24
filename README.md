# Product Ledger

Next.js (React) dashboard + API routes + Postgres. Search products, add one with the form, or bulk-import lines.

## Local
```
npm install
npm run dev        # http://localhost:3000
```
Without `DATABASE_URL` it stores data in `.data/products.json` (local dev only), seeded from `data/seed.json`
(parsed from `data/product_urls.txt`; regenerate with `npm run make-seed`).

## Deploy to Vercel
1. Push this folder to a Git repo and import it in Vercel.
2. In the project: Storage -> add a Postgres database (Neon). That sets `DATABASE_URL`.
3. Optional: set `APP_PASSWORD` to require a password for add / import / delete.
4. Deploy. On the first request the table is created and seeded from `data/seed.json` if it is empty.
