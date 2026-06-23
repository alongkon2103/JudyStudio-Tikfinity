"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * Locale switch — two-segment pill. Writes the new locale to the
 * cookie via /api/preferences, then `router.refresh()` so server
 * components re-render with the new dictionary.
 */
export function LocaleToggle({
  current,
  labels,
}: {
  current: Locale;
  labels:  { th: string; en: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current || pending) return;
    startTransition(async () => {
      await fetch("/api/preferences", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-pill tint-soft p-0.5 text-[12px] font-semibold"
    >
      <Segment active={current === "th"} onClick={() => setLocale("th")}>{labels.th}</Segment>
      <Segment active={current === "en"} onClick={() => setLocale("en")}>{labels.en}</Segment>
    </div>
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-pill px-2.5 py-1 transition-colors duration-fast ease-out " +
        (active
          ? "bg-pink-500 text-white"
          : "text-fg-dark-soft hover:text-fg-dark")
      }
    >
      {children}
    </button>
  );
}
