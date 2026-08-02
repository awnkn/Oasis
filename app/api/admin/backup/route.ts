import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createBackupBuffer } from "@/lib/backup";
import { logAction } from "@/lib/bookings";
import { today } from "@/lib/dates";

export async function GET() {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }

  const buf = await createBackupBuffer();
  logAction(
    { name: session.name, role: session.role },
    "backup",
    `Downloaded database backup (${Math.round(buf.length / 1024)} KB)`
  );

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="oasis-backup-${today()}.db"`,
      "Cache-Control": "no-store",
    },
  });
}
