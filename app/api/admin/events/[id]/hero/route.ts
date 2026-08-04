import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { setEventHero } from "@/lib/events";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// Managers upload an event's hero photo (multipart/form-data, field "file").
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (session?.role !== "manager") {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected an image upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
  }
  const type = file.type.toLowerCase();
  if (!ALLOWED.includes(type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG or WebP image." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (6 MB max). Please use a smaller photo." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ok = setEventHero(eventId, buffer, type, {
    name: session.name,
    role: session.role,
  });
  if (!ok) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
