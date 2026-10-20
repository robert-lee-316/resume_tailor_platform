const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
export const runtime = "nodejs";
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return Response.json({ status: "offline", libreoffice: false }, { status: 503 });
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "offline", libreoffice: false }, { status: 503 });
  }
}
