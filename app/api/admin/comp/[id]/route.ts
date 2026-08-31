import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteCompAccess } from "@/lib/comp";

/** Remove a complimentary-access entry (e.g. logged by mistake). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const compId = Number.parseInt(id, 10);
  if (!Number.isInteger(compId) || compId < 1) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const ok = deleteCompAccess(compId, { name: session.name, role: session.role });
  if (!ok) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
