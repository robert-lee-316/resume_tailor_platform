import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = await request.formData();
    const template = input.get("template");
    if (!(template instanceof File) || !template.name.toLowerCase().endsWith(".docx")) {
      return Response.json({ detail: "Please choose a .docx Word file." }, { status: 400 });
    }
    if (template.size > 5 * 1024 * 1024) {
      return Response.json({ detail: "Template must be smaller than 5 MB." }, { status: 413 });
    }
    const form = new FormData();
    form.set("template", template, template.name);
    const response = await fetch(`${BACKEND_URL}/api/inspect-template`, { method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "Cannot connect to the document server." }, { status: 503 });
  }
}
