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
      <div className="glass mx-auto flex items-center justify-between gap-3 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2">
        <Link
          href="/"
          aria-label={t.brand.name}
          className="group inline-flex items-center gap-2 font-display text-[15px] tracking-tight"
        >
          <Image
            src="/images/JudyLogo.png"
            alt=""
            width={32}
            height={32}
            priority
            className="rounded-md ring-1 ring-white/10"
          />
          <span className="font-extrabold text-fg-dark">{t.brand.studio}</span>
          <span className="text-fg-dark-mute" aria-hidden>|</span>
          <span className="font-extrabold text-pink-400 transition-colors group-hover:text-pink-300">
            {t.brand.product}
          </span>
        </Link>
        <div className="flex items-center gap-2">
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
