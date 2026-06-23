import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { safeNextPath } from "@/lib/redirect";
import { db } from "@/lib/db";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title:  "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = safeNextPath(searchParams.next);

  const session = await getAdminSession();
  if (session) {
    const user = await db.adminUser.findUnique({
      where:  { id: session.sub },
      select: { isActive: true, tokenVersion: true },
    });
    if (user?.isActive && user.tokenVersion === session.tv) redirect(next);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="sticker w-full max-w-sm rounded-lg p-8 anim-scale-in">
        <header className="mb-6 text-center">
          <Image
            src="/images/JudyLogo.png"
            alt="Judy Studio"
            width={72}
            height={72}
            priority
            className="mx-auto mb-3 rounded-lg ring-1 ring-line-light"
          />
          <h1 className="font-display text-[28px] font-extrabold tracking-tight text-fg-light">Admin</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-light-mute">
            JudyShop Tikfinity
          </p>
        </header>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
