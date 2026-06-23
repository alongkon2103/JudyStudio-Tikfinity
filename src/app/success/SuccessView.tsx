"use client";

import { useEffect, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";

const INTL_LOCALE: Record<Locale, string> = {
  th: "th-TH",
  en: "en-US",
};

type OrderStatus = "PAID" | "FULFILLED" | "FAILED";

type OrderSummary = {
  status:         OrderStatus;
  username:       string | null;
  tikfinityEmail: string;
  durationDays:   number;
  priceTHBSatang: number;
  oldExpireAt:    string | null;
  newExpireAt:    string | null;
  fulfilledAt:    string | null;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 60_000;

export function SuccessView({
  sessionId,
  dict,
  locale,
}: {
  sessionId: string;
  dict:      Dict;
  locale:    Locale;
}) {
  const [order, setOrder]       = useState<OrderSummary | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;

        if (!data.ok) { setError(data.error || dict.errors.generic); return; }

        if (data.processing) {
          if (Date.now() - started > POLL_TIMEOUT_MS) { setTimedOut(true); return; }
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        setOrder(data.order);
        if (data.order.status === "FULFILLED" || data.order.status === "FAILED") return;
        if (Date.now() - started > POLL_TIMEOUT_MS) { setTimedOut(true); return; }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setError(dict.errors.network);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [sessionId, dict.errors.generic, dict.errors.network]);

  if (error) {
    return (
      <Centered>
        <Icon variant="error" />
        <h1 className="mt-4 font-display text-[20px] font-extrabold text-fg-light">{error}</h1>
        <SessionId label={dict.success.session} id={sessionId} />
      </Centered>
    );
  }

  if (!order) {
    return (
      <Centered>
        <Spinner />
        <p className="mt-4 text-[13px] text-fg-light-soft">{dict.success.processing}</p>
      </Centered>
    );
  }

  if (order.status === "FULFILLED")  return <FulfilledView order={order} dict={dict} locale={locale} />;

  if (order.status === "FAILED") {
    return (
      <Centered>
        <Icon variant="error" />
        <h1 className="mt-4 font-display text-[18px] font-extrabold text-fg-light">{dict.success.failedHead}</h1>
        <p className="mt-2 text-[13px] text-fg-light-soft">{dict.success.failedBody}</p>
        <SessionId label={dict.success.session} id={sessionId} />
      </Centered>
    );
  }

  if (timedOut) {
    return (
      <Centered>
        <Spinner />
        <h1 className="mt-4 font-display text-[16px] font-extrabold text-fg-light">{dict.success.processing}</h1>
        <p className="mt-2 text-[13px] text-fg-light-soft">{dict.success.longer}</p>
      </Centered>
    );
  }

  return (
    <Centered>
      <Spinner />
      <h1 className="mt-4 font-display text-[16px] font-extrabold text-fg-light">{dict.success.processing}</h1>
      <p className="mt-2 text-[13px] text-fg-light-soft">{dict.success.paid}</p>
    </Centered>
  );
}

function FulfilledView({
  order,
  dict,
  locale,
}: {
  order:  OrderSummary;
  dict:   Dict;
  locale: Locale;
}) {
  const tag = INTL_LOCALE[locale];
  const newExpireStr = order.newExpireAt
    ? new Date(order.newExpireAt).toLocaleString(tag, {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "—";
  const baht = (order.priceTHBSatang / 100).toLocaleString(tag);

  return (
    <div className="sticker rounded-lg p-6 text-center anim-scale-in">
      <Icon variant="success" />
      <h1 className="mt-5 font-display text-[24px] font-extrabold text-fg-light">{dict.success.title}</h1>
      <p className="mt-1 text-[13px] text-fg-light-soft">
        @{order.username ?? "—"} · {order.tikfinityEmail}
      </p>

      <dl className="mt-6 space-y-2 rounded-md bg-paper-2 p-4 text-left text-[13px]">
        <Row label={dict.success.package}   value={`${order.durationDays} ${dict.form.days}`} />
        <Row label={dict.success.total}     value={`฿${baht}`} />
        <Row label={dict.success.newExpire} value={newExpireStr} highlight />
      </dl>

      <p className="mt-5 text-[11px] text-fg-light-mute">{dict.success.refresh}</p>

      <a
        href="/"
        className="mt-6 inline-block rounded-pill bg-pink-500 px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_3px_0_var(--pink-600)] transition-transform duration-fast ease-spring hover:-translate-y-0.5 active:translate-y-0.5"
      >
        {dict.success.buyMore}
      </a>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-light-mute">{label}</dt>
      <dd className={highlight ? "font-extrabold text-pink-400 text-right" : "text-fg-light text-right"}>
        {value}
      </dd>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="sticker rounded-lg p-8 text-center anim-fade-up">{children}</div>;
}

function Spinner() {
  return (
    <div className="mx-auto h-10 w-10 animate-spin rounded-pill border-[3px] border-pink-500/20 border-t-pink-500" aria-label="loading" />
  );
}

function SessionId({ label, id }: { label: string; id: string }) {
  return (
    <p className="mt-4 break-all text-[10px] text-fg-light-mute">
      <span className="font-bold uppercase tracking-[0.16em]">{label}:</span> {id}
    </p>
  );
}

function Icon({ variant }: { variant: "success" | "error" }) {
  if (variant === "success") {
    return (
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-ok/15 text-ok">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-bad/15 text-bad">
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
        <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
