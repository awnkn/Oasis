import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { removeClosedDate } from "@/lib/closures";
import { isValidDateString } from "@/lib/dates";

/** Reopen a previously-closed date. Manager-only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can change closures." },
      { status: 403 }
    );
  }
  const { date } = await params;
  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  const ok = removeClosedDate(date, { name: session.name, role: session.role });
  if (!ok) {
    return NextResponse.json({ error: "That date was not closed." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
