// Turns the messy product_urls.txt (CSV lines + JSON request fragments) into {name, category_code, url} rows.

export function nameFromUrl(url) {
  try {
    const file = decodeURIComponent(new URL(url).pathname.split("/").pop().replace(/\+/g, " "));
    return file
      .replace(/\.[A-Za-z0-9]{2,4}$/, "")
      .replace(/[_\s]+\d{9,}[_\s]+[0-9a-f]{8}[_\s]+[0-9a-f]{8}$/i, "") // trailing export hash
      .replace(/_+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return url;
  }
}

const CSV_LINE = /^\s*(.+?)\s*,\s*(\d+(?:\.\d+)*)\s*,\s*(https?:\/\/\S+)\s*$/;
const IMAGE_URL = /"image_url"\s*:\s*"([^"]+)"/;
const CATEGORY = /"food_category"\s*:\s*"([^"]+)"/;

export const COUNTRIES = ["India", "US", "Canada", "GCC"];

export function parseProductText(text, country = "India") {
  const rows = [];
  let url = null;
  let category = null;
  for (const line of String(text).split(/\r?\n/)) {
    const csv = line.match(CSV_LINE);
    if (csv) {
      rows.push({ name: csv[1], category_code: csv[2], url: csv[3], country, named: true });
      continue;
    }
    const u = line.match(IMAGE_URL);
    const c = line.match(CATEGORY);
    if (u) url = u[1];
    if (c) category = c[1];
    if (url && category) {
      rows.push({ name: nameFromUrl(url), category_code: category, url, country });
      url = category = null;
    }
  }
  // One row per URL; a row with a real name (CSV line) wins over a name guessed from the file name.
  const byUrl = new Map();
  for (const { named, ...row } of rows) {
    if (!byUrl.has(row.url) || named) byUrl.set(row.url, row);
  }
  return [...byUrl.values()];
}

export const CATEGORY_RE = /^\d+(\.\d+)*$/;

export function validateProduct(p) {
  const name = String(p?.name ?? "").trim();
  const category_code = String(p?.category_code ?? "").trim();
  const url = String(p?.url ?? "").trim();
  const country = String(p?.country ?? "India").trim();
  if (!COUNTRIES.includes(country)) return { error: `Country must be one of ${COUNTRIES.join(", ")}` };
  if (!name) return { error: "Product name is required" };
  if (!CATEGORY_RE.test(category_code)) return { error: "Category code must look like 4.1.2.7" };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return { error: "Enter a valid http(s) URL" };
  }
  return { value: { name, category_code, url, country } };
}
