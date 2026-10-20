import { NextRequest } from "next/server";

export const runtime = "nodejs";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File) || !/\.(docx|pdf)$/i.test(file.name)) {
      return Response.json({ detail: "Choose a DOCX or selectable-text PDF resume." }, { status: 400 });
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      return Response.json({ detail: "Resume must be between 1 byte and 5 MB." }, { status: 413 });
    }
    const form = new FormData();
    form.set("file", file, file.name);
    const upstream = await fetch(`${BACKEND_URL}/api/generate-template-from-resume`, {
      method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(40_000),
    });
    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-GuruCorp-Template-Mode": upstream.headers.get("X-GuruCorp-Template-Mode") ?? "generated",
      },
    });
  } catch {
    return Response.json({ detail: "Could not create the Word template. Make sure FastAPI is running." }, { status: 503 });
  }
}
