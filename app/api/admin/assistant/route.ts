import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/assistant";
import { getAdminSession } from "@/lib/auth";

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
  const question =
    typeof (body as { question?: unknown })?.question === "string"
      ? ((body as { question: string }).question ?? "").trim().slice(0, 300)
      : "";
  if (!question) {
    return NextResponse.json({ error: "Ask me a question first." }, { status: 400 });
  }

  return NextResponse.json({ answer: answerQuestion(question, session.role) });
}
