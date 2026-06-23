"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { safeNextPath } from "@/lib/redirect";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [pending, setPending]   = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        setPending(false);
        return;
      }
      router.push(safeNextPath(next));
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && (
        <p className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12px] font-semibold text-bad">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full rounded-pill bg-pink-500 px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white",
          "shadow-[0_3px_0_var(--pink-600),0_10px_28px_-8px_hsl(330_80%_50%/0.45)]",
          "transition-transform duration-fast ease-spring hover:-translate-y-0.5 active:translate-y-0.5",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0",
        )}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">{label}</span>
      {children}
    </label>
  );
}

const inputClass = cn(
  "w-full rounded-md border border-line-light bg-paper-2 px-3.5 py-2.5 text-[14px] text-fg-light",
  "outline-none transition-colors duration-fast",
  "focus:border-pink-400 focus:ring-4 focus:ring-pink-400/15",
);
