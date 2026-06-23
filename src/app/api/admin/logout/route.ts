import { NextResponse, type NextRequest } from "next/server";
import { buildClearCookie } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { checkOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Logout. Bumps tokenVersion so any OTHER cookies copies (other
 * devices, stolen sessions) are revoked too — not just this browser.
 */
export async function POST(req: NextRequest) {
  const originBlock = checkOrigin(req);
  if (originBlock) return originBlock;

  const session = await getAdminSession();
  if (session) {
    await db.adminUser.update({
      where: { id: session.sub },
      data:  { tokenVersion: { increment: 1 } },
    }).catch(() => {
      // Best-effort — even if the DB update fails, we still clear
      // the cookie so the user is logged out on this device.
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(buildClearCookie());
  return res;
}
