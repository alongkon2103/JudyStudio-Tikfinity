import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buildSessionCookie,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, hit, reset, retryAfterSeconds } from "@/lib/rate-limit";
import { checkOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const LoginInput = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(1).max(200),
});

// IP bucket: 5 tries / 15 min — broad lane.
// Email bucket: 3 tries / 3 hours — hard lockout per account.
const IP_WINDOW_MS    = 15 * 60 * 1000;
const IP_LIMIT        = 5;
const EMAIL_WINDOW_MS = 3 * 60 * 60 * 1000;
const EMAIL_LIMIT     = 3;

function tooMany(resetIn: number) {
  const retryAfter = retryAfterSeconds(resetIn);
  return NextResponse.json(
    { error: "Too many attempts. Please try again later.", retryAfterSec: retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(req: NextRequest) {
  const originBlock = checkOrigin(req);
  if (originBlock) return originBlock;

  const ip = clientIp(req);

  // Pre-check the IP bucket before bcrypt so a script can't burn CPU
  // by spraying invalid payloads.
  const ipCheck = hit(`login:ip:${ip}`, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS });
  if (!ipCheck.ok) return tooMany(ipCheck.resetIn);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = LoginInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { password } = parsed.data;
  const emailKey = parsed.data.email.trim().toLowerCase();

  const emailCheck = hit(`login:email:${emailKey}`, {
    limit:    EMAIL_LIMIT,
    windowMs: EMAIL_WINDOW_MS,
  });
  if (!emailCheck.ok) return tooMany(emailCheck.resetIn);

  const user = await db.adminUser.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
  });

  // Use a dummy bcrypt hash for both "no such user" and "inactive
  // user" paths so the bcrypt timing is identical — an attacker can't
  // enumerate live admin emails.
  const hash =
    user && user.isActive
      ? user.passwordHash
      : "$2a$12$invalidinvalidinvalidinvalidinvali";
  const ok = await verifyPassword(password, hash);

  if (!user || !user.isActive || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Successful auth — drop counters so a real admin who mistyped
  // doesn't stay locked out.
  reset(`login:ip:${ip}`);
  reset(`login:email:${emailKey}`);

  const token  = await signSession({ sub: user.id, email: user.email, tv: user.tokenVersion });
  const cookie = buildSessionCookie(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie);
  return res;
}
