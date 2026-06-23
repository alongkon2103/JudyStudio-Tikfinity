import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/tikfinity";
import { clientIp, hit, retryAfterSeconds } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

// 20 lookups / 5 min per IP — generous for a real user (typo retries,
// switching emails) but enough to throttle scrapers trying to enumerate
// Tikfinity emails through our endpoint.
const IP_LIMIT     = 20;
const IP_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const bucket = hit(`check-email:ip:${ip}`, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS });
  if (!bucket.ok) {
    const retryAfter = retryAfterSeconds(bucket.resetIn);
    return NextResponse.json(
      { ok: false, error: "ตรวจสอบบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "กรุณาใส่ email ให้ถูกต้อง" },
      { status: 400 },
    );
  }

  const result = await findUserByEmail(parsed.data.email);
  if (!result.ok) {
    if (result.code === "EMAIL_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "ไม่พบ email นี้ใน Tikfinity — กรุณาสมัครและล็อกอินใน Tikfinity ก่อนอย่างน้อย 1 ครั้ง" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "เชื่อมต่อ Tikfinity ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      channelId:   result.data.channelId,
      username:    result.data.username,
      proActive:   result.data.proActive,
      proExpireAt: result.data.proExpireAt?.toISOString() ?? null,
    },
  });
}
