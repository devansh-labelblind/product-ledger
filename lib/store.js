import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import seed from "../data/seed.json";

// Postgres when DATABASE_URL is set (Vercel / Neon). Otherwise, in local dev only, a JSON file in .data/.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const FILE = path.join(process.cwd(), ".data", "products.json");

let ready;

function pg() {
  const sql = neon(url);
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category_code TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India'`;
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM products`;
    if (n === 0) {
      for (const p of seed) {
        await sql`INSERT INTO products (name, category_code, url, country) VALUES (${p.name}, ${p.category_code}, ${p.url}, ${p.country ?? "India"}) ON CONFLICT (url) DO NOTHING`;
      }
    }
  })();
  return ready.then(() => sql);
}

function readFile() {
  if (!fs.existsSync(FILE)) {
    const now = new Date().toISOString();
    const rows = seed.map((p, i) => ({ id: i + 1, country: "India", ...p, created_at: now }));
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
    return rows;
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
const writeFile = (rows) => fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));

function assertConfigured() {
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Add a Postgres (Neon) database to the Vercel project.");
  }
}

export async function listProducts() {
  assertConfigured();
  if (url) return (await pg())`SELECT id, name, category_code, url, country, created_at FROM products ORDER BY id DESC`;
  return readFile().map((r) => ({ country: "India", ...r })).sort((a, b) => b.id - a.id);
}

// Returns the added rows; rows whose URL already exists are skipped.
export async function addProducts(items) {
  assertConfigured();
  if (url) {
    const sql = await pg();
    const added = [];
    for (const p of items) {
      const r = await sql`INSERT INTO products (name, category_code, url, country) VALUES (${p.name}, ${p.category_code}, ${p.url}, ${p.country ?? "India"})
        ON CONFLICT (url) DO NOTHING RETURNING id, name, category_code, url, country, created_at`;
      added.push(...r);
    }
    return added;
  }
  const rows = readFile();
  const known = new Set(rows.map((r) => r.url));
  let id = rows.reduce((m, r) => Math.max(m, r.id), 0);
  const added = [];
  for (const p of items) {
    if (known.has(p.url)) continue;
    known.add(p.url);
    const row = { id: ++id, country: "India", ...p, created_at: new Date().toISOString() };
    rows.push(row);
    added.push(row);
  }
  writeFile(rows);
  return added;
}

export async function deleteProduct(id) {
  assertConfigured();
  if (url) {
    const r = await (await pg())`DELETE FROM products WHERE id = ${id} RETURNING id`;
    return r.length > 0;
  }
  const rows = readFile();
  const next = rows.filter((r) => r.id !== id);
  writeFile(next);
  return next.length !== rows.length;
}
