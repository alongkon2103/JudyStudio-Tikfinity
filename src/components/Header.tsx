import Link from "next/link";
import Image from "next/image";
import { getDict, getLocale } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleToggle } from "./LocaleToggle";

/**
 * Public-site header — brand mark on the left, theme + locale on the
 * right. Sits inside a glass pill so it floats over the canvas
 * gradient without fighting it for attention.
 *
 * The Admin link is dev-only — it makes hopping into /admin fast
 * during local work but never ships to production, so the path stays
 * un-advertised to public visitors. The NODE_ENV check is evaluated
 * at build time, so the link is fully dead-stripped from prod bundles
 * (not just `display:none`-hidden).
 */
const SHOW_ADMIN_LINK = process.env.NODE_ENV !== "production";

export function Header({ showAdminLink = false }: { showAdminLink?: boolean }) {
  const locale = getLocale();
  const t = getDict(locale);
  const renderAdmin = showAdminLink && SHOW_ADMIN_LINK;

  return (
    <header className="mx-auto mt-4 max-w-3xl px-4">
      <div className="glass mx-auto flex items-center justify-between gap-2 rounded-pill px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
        <Link
          href="/"
          aria-label={t.brand.name}
          className="group inline-flex min-w-0 items-center gap-2 font-display text-[15px] tracking-tight"
        >
          <Image
            src="/images/JudyLogo.png"
            alt=""
            width={32}
            height={32}
            priority
            className="shrink-0 rounded-md ring-1 ring-white/10"
          />
          {/* On phones the studio name + divider collapse so the bar
              never overflows; the logo + product mark stay as the
              recognisable brand. Full lockup returns at sm+. */}
          <span className="hidden font-extrabold text-fg-dark sm:inline">{t.brand.studio}</span>
          <span className="hidden text-fg-dark-mute sm:inline" aria-hidden>|</span>
          <span className="truncate font-extrabold text-pink-400 transition-colors group-hover:text-pink-300">
            {t.brand.product}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {renderAdmin && (
            <Link
              href="/admin"
              className="rounded-pill px-2.5 py-1 text-[12px] font-semibold text-fg-dark-soft hover:text-fg-dark"
            >
              {t.nav.admin}
            </Link>
          )}
          <LocaleToggle current={locale} labels={t.nav.locale} />
          <ThemeToggle labels={t.nav.theme} />
        </div>
      </div>
    </header>
  );
}
