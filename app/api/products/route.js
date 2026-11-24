import { listProducts, addProducts } from "@/lib/store";
import { validateProduct } from "@/lib/parse";
import { writeAllowed, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ products: await listProducts() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!writeAllowed(request)) return unauthorized();
  const { error, value } = validateProduct(await request.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });
  try {
    const [added] = await addProducts([value]);
    if (!added) return Response.json({ error: "This URL is already in the ledger" }, { status: 409 });
    return Response.json({ product: added }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
