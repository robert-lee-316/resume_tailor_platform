import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const template = form.get("template");
    const json = form.get("resume_json");
    const format = form.get("format");
    if (!(template instanceof File) || typeof json !== "string" || (format !== "pdf" && format !== "docx")) {
      return Response.json({ detail: "Supply a .docx template, resume_json and pdf/docx format." }, { status: 400 });
    }
    if (template.size > 5 * 1024 * 1024 || json.length > 150 * 1024) {
      return Response.json({ detail: "Template or resume data exceeds upload limits." }, { status: 413 });
    }
    const upstreamForm = new FormData();
    upstreamForm.set("template", template, template.name);
    upstreamForm.set("resume_json", json);
    upstreamForm.set("format", format);
    const upstream = await fetch(`${BACKEND_URL}/api/render`, {
      method: "POST", body: upstreamForm, cache: "no-store", signal: AbortSignal.timeout(58_000),
    });
    if (!upstream.ok) {
      const error = await upstream.text();
      return new Response(error, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "text/plain" } });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError"
      ? "Document generation took too long. Please retry."
      : "Cannot connect to the document server. Start FastAPI on port 8000.";
    return Response.json({ detail }, { status: 503 });
  }
}
