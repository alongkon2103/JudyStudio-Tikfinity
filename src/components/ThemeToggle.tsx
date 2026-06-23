"use client";

import { useEffect, useState } from "react";

const THEME_COOKIE = "judytik_theme";

/**
 * Toggle between light/dark theme. Reads + writes both:
 *   - `data-theme` attribute on <html> (CSS reads this for var swap)
 *   - `judytik_theme` cookie (server reads this on next paint; the
 *      inline pre-paint script in layout.tsx reads it to avoid flash)
 *
 * Two-step write — set the DOM first for instant feedback, then POST
 * to /api/preferences so the cookie persists across page loads.
 */
export function ThemeToggle({ labels }: { labels: { dark: string; light: string } }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = (document.documentElement.getAttribute("data-theme") as
      | "dark"
      | "light"
      | null) ?? "dark";
    setTheme(initial);
    setReady(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    // Local cookie write so the pre-paint script can read it on
    // next navigation without waiting for the API roundtrip.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // Fire-and-forget — failure here is non-critical (DOM already updated).
    fetch("/api/preferences", {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }

  const isDark = theme === "dark";
  const label = isDark ? labels.light : labels.dark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-pill tint-soft tint-soft-hover transition-colors duration-fast ease-out"
    >
      {/* Sun / moon — only one renders to avoid hydration mismatch. */}
      <span aria-hidden className="block">
        {ready && isDark ? <MoonIcon /> : ready ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}
