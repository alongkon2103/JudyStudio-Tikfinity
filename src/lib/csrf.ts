/**
 * Origin-header CSRF defence for state-changing JSON endpoints.
 *
 * Server Actions are already protected by Next.js automatically.
 * Plain `route.ts` handlers aren't — this gates them.
 */
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";

export function checkOrigin(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Missing Origin header." }, { status: 403 });
  }

  let allowed: string;
  try {
    allowed = new URL(env.SITE_URL).host;
  } catch {
    return NextResponse.json({ error: "Server origin not configured." }, { status: 500 });
  }

  let got: string;
  try {
    got = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Malformed Origin header." }, { status: 403 });
  }

  if (got !== allowed) {
    return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }
  return null;
}
