import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/users";

export async function GET() {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (
    typeof b.name !== "string" ||
    typeof b.password !== "string" ||
    (b.role !== "manager" && b.role !== "staff")
  ) {
    return NextResponse.json(
      { error: "Name, password and role are required." },
      { status: 400 }
    );
  }

  const result = createUser(b.name, b.password, b.role, {
    name: session.name,
    role: session.role,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
