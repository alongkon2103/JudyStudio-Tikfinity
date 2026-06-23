import { cookies } from "next/headers";
import { th, type Dict } from "@/locales/th";
import { en } from "@/locales/en";

/**
 * Cookie-based locale resolution. Server components call `getLocale()`
 * / `getDict()` directly; client components receive the resolved dict
 * as a prop so they never need their own React context.
 *
 * Default is Thai — the target market is Thai TikTok creators. EN is
 * a secondary surface for international users.
 */
export type Locale = "th" | "en";

export const LOCALE_COOKIE = "judytik_locale";

export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return v === "en" ? "en" : "th";
}

export function getDict(locale: Locale = getLocale()): Dict {
  return locale === "en" ? en : th;
}

export type { Dict };
