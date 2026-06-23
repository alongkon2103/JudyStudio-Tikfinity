"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-line-dark bg-paper px-2.5 py-1 text-[12px] font-semibold text-fg-dark-soft hover:bg-paper-3 disabled:opacity-60"
    >
      {pending ? "…" : "Logout"}
    </button>
  );
}
