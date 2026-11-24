import { deleteProduct } from "@/lib/store";
import { writeAllowed, unauthorized } from "@/lib/auth";

export async function DELETE(request, { params }) {
  if (!writeAllowed(request)) return unauthorized();
  try {
    const ok = await deleteProduct(Number(params.id));
    return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
