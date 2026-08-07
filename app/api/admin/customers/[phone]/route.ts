import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getCustomerProfile, updateCustomer, type CustomerUpdate } from "@/lib/customers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { phone } = await params;
  const profile = getCustomerProfile(decodeURIComponent(phone));
  if (!profile) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { phone } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const update: CustomerUpdate = {};
  if (b.notes !== undefined) {
    if (b.notes !== null && typeof b.notes !== "string") {
      return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
    }
    update.notes = b.notes as string | null;
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) {
      return NextResponse.json({ error: "Tags must be a list." }, { status: 400 });
    }
    update.tags = b.tags.filter((t): t is string => typeof t === "string");
  }
  if (b.vip !== undefined) {
    if (typeof b.vip !== "boolean") {
      return NextResponse.json({ error: "VIP must be true or false." }, { status: 400 });
    }
    update.vip = b.vip;
  }

  const result = updateCustomer(
    decodeURIComponent(phone),
    update,
    { name: session.name, role: session.role }
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
