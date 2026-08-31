import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addCompAccess } from "@/lib/comp";

/** Log a complimentary (free) entry. Any signed-in staff member may add one. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = addCompAccess(
    {
      name: typeof b.name === "string" ? b.name : "",
      people: typeof b.people === "number" ? b.people : NaN,
      date: typeof b.date === "string" ? b.date : "",
      reason: typeof b.reason === "string" ? b.reason : undefined,
    },
    { name: session.name, role: session.role }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
