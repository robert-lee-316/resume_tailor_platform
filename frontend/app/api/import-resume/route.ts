import { NextRequest } from "next/server";

export const runtime = "nodejs";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File) || !/\.(docx|pdf)$/i.test(file.name)) {
      return Response.json({ detail: "Choose a .docx or selectable-text .pdf resume." }, { status: 400 });
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      return Response.json({ detail: "Previous resume must be 5 MB or smaller." }, { status: 413 });
    }
    const form = new FormData();
    form.set("file", file, file.name);
    const upstream = await fetch(`${BACKEND_URL}/api/import-resume`, {
      method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ detail: "Could not import the resume. Check that FastAPI is running." }, { status: 503 });
  }
}
