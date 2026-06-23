import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin-session";
import { LogoutButton } from "../LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getDict, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const locale  = getLocale();
  const t       = getDict(locale);

  return (
    <div className="admin-canvas">
      <nav className="admin-surface sticky top-0 z-20 border-b border-line-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="inline-flex items-center gap-2 text-[14px] tracking-tight">
              <Image
                src="/images/JudyLogo.png"
                alt=""
                width={28}
                height={28}
                priority
                className="rounded-md ring-1 ring-white/10"
              />
              <span className="font-extrabold text-fg-dark">{t.brand.studio}</span>
              <span className="text-fg-dark-mute" aria-hidden>|</span>
              <span className="font-extrabold text-pink-400">{t.brand.product}</span>
              <span className="ml-1 text-fg-dark-mute font-medium">Admin</span>
            </Link>
            <ul className="hidden gap-1 sm:flex">
              <NavItem href="/admin">Dashboard</NavItem>
              <NavItem href="/admin/orders">Orders</NavItem>
              <NavItem href="/admin/pricing">Pricing</NavItem>
              <NavItem href="/admin/payment-methods">Payments</NavItem>
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] text-fg-dark-mute sm:inline">{session.email}</span>
            <ThemeToggle labels={t.nav.theme} />
            <LogoutButton />
          </div>
        </div>
        <ul className="flex gap-1 border-t border-line-dark-2 px-4 py-1.5 sm:hidden">
          <NavItem href="/admin">Dashboard</NavItem>
          <NavItem href="/admin/orders">Orders</NavItem>
          <NavItem href="/admin/pricing">Pricing</NavItem>
        </ul>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6 anim-fade-up">{children}</main>
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-fg-dark-soft hover:bg-paper hover:text-fg-dark"
      >
        {children}
      </Link>
    </li>
  );
}
