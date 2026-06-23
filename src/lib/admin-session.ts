import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type AdminSession } from "./auth";
import { db } from "./db";

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const user = await db.adminUser.findUnique({
    where: { id: session.sub },
    select: { isActive: true, tokenVersion: true },
  });
  if (!user || !user.isActive || user.tokenVersion !== session.tv) {
    redirect("/admin/login");
  }

  return session;
}
