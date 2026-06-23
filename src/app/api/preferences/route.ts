import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

const THEME_COOKIE = "judytik_theme";

/**
 * Persist UI preferences (theme + locale) into HttpOnly-ish cookies.
 *
 * Theme cookie is NOT HttpOnly — the pre-paint inline script needs
 * to read it on first render to avoid a flash of wrong theme. The
 * value is just "dark" | "light" so JS readability has zero security
 * impact (an attacker reading it sees your colour preference, which
 * is already visible from the rendered page).
 *
 * Locale cookie is read server-side only via getLocale() — kept here
 * to share endpoint and reuse the validation pattern.
 */
const Body = z.object({
  theme:  z.enum(["dark", "light"]).optional(),
  locale: z.enum(["th", "en"]).optional(),
});

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  if (parsed.data.theme) {
    res.cookies.set(THEME_COOKIE, parsed.data.theme, {
      httpOnly: false,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   ONE_YEAR_SECONDS,
    });
  }
  if (parsed.data.locale) {
    res.cookies.set(LOCALE_COOKIE, parsed.data.locale, {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   ONE_YEAR_SECONDS,
    });
  }
  return res;
}
