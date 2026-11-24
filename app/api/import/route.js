import { addProducts } from "@/lib/store";
import { parseProductText, COUNTRIES } from "@/lib/parse";
import { writeAllowed, unauthorized } from "@/lib/auth";

export async function POST(request) {
  if (!writeAllowed(request)) return unauthorized();
  const { text, country = "India" } = await request.json().catch(() => ({}));
  if (!COUNTRIES.includes(country)) return Response.json({ error: "Invalid country" }, { status: 400 });
  const rows = parseProductText(text || "", country);
  if (!rows.length) return Response.json({ error: "No products found. Use lines like: Name, 4.1.2.7, https://..." }, { status: 400 });
  try {
    const added = await addProducts(rows);
    return Response.json({ found: rows.length, added: added.length, skipped: rows.length - added.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
