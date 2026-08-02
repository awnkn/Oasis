import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { updateUser } from "@/lib/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isInteger(userId) || userId < 1) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const changes: { active?: boolean; password?: string; role?: "manager" | "staff" } = {};
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean." }, { status: 400 });
    }
    changes.active = b.active;
  }
  if (b.password !== undefined) {
    if (typeof b.password !== "string") {
      return NextResponse.json({ error: "password must be a string." }, { status: 400 });
    }
    changes.password = b.password;
  }
  if (b.role !== undefined) {
    if (b.role !== "manager" && b.role !== "staff") {
      return NextResponse.json({ error: "Role must be manager or staff." }, { status: 400 });
    }
    changes.role = b.role;
  }
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const result = updateUser(userId, changes, {
    name: session.name,
    role: session.role,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
