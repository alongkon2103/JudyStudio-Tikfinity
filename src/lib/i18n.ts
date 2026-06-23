import { cookies } from "next/headers";
import { th, type Dict } from "@/locales/th";
import { en } from "@/locales/en";

/**
 * Cookie-based locale resolution. Server components call `getLocale()`
 * / `getDict()` directly; client components receive the resolved dict
 * as a prop so they never need their own React context.
 *
 * Default is English — the storefront targets international Tikfinity
 * users first. Thai is a secondary surface; Thai visitors can switch
 * via the locale toggle and the choice is persisted in the cookie.
 */
export type Locale = "th" | "en";

export const LOCALE_COOKIE = "judytik_locale";

export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return v === "th" ? "th" : "en";
}

export function getDict(locale: Locale = getLocale()): Dict {
  return locale === "th" ? th : en;
}

export type { Dict };
