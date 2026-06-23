"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import type { Dict, Locale } from "@/lib/i18n";

/** Map our 2-char locale to the BCP-47 tag that Intl APIs expect.
 *  Centralised so all date/number formatters stay in sync. */
const INTL_LOCALE: Record<Locale, string> = {
  th: "th-TH",
  en: "en-US",
};

type Variant = {
  id:             string;
  durationDays:   number;
  label:          string;
  labelEn:        string | null;
  priceTHBSatang: number;
  priceUSDCents:  number | null;
};

type PaymentMethod = {
  id:      string;
  label:   string;
  labelEn: string;
  /// Surcharge in basis points (1 bp = 0.01%). 600 = 6.00%.
  feeBps:  number;
};

/** Pick the display label for the current locale. EN falls back to TH
 *  when the admin hasn't filled an English translation in /admin/pricing. */
function variantLabel(v: Variant, locale: Locale): string {
  if (locale === "en") return v.labelEn ?? v.label;
  return v.label;
}

function methodLabel(m: PaymentMethod, locale: Locale): string {
  return locale === "en" ? m.labelEn : m.label;
}

/** Pure integer fee math — mirrors server-side computeFeeSatang.
 *  Client uses this only for preview; checkout API recomputes from
 *  fresh DB data so a stale browser tab can't undercharge. */
function feeSatang(base: number, feeBps: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(feeBps) || feeBps <= 0) return 0;
  return Math.floor((base * feeBps) / 10_000);
}

type CheckedUser = {
  channelId:   number;
  username:    string;
  proActive:   boolean;
  proExpireAt: string | null;
};

type Step = "email" | "duration" | "method" | "redirecting";

export function OrderForm({
  variants,
  paymentMethods,
  dict,
  locale,
}: {
  variants:       Variant[];
  paymentMethods: PaymentMethod[];
  dict:           Dict;
  locale:         Locale;
}) {
  const [step, setStep]   = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [user, setUser]   = useState<CheckedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** The variant the user picked on step 2. We hold it through step 3
   *  (method picker) so the confirm modal can show variant + method
   *  + computed total side-by-side. */
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  /** Non-null = confirm modal is open. Carries both pieces the
   *  customer just decided on so the modal can be a pure render. */
  const [pending, setPending] = useState<{ variant: Variant; method: PaymentMethod } | null>(null);

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tikfinity/check-email", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || dict.errors.generic); return; }
      setUser(data.user);
      setStep("duration");
    } catch {
      setError(dict.errors.network);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectVariant(variant: Variant) {
    if (loading) return;
    setError(null);
    setSelectedVariant(variant);
    setStep("method");
  }

  function handleSelectMethod(method: PaymentMethod) {
    if (!selectedVariant || loading) return;
    setError(null);
    setPending({ variant: selectedVariant, method });
  }

  function handleBackToDuration() {
    setStep("duration");
    setSelectedVariant(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!pending || loading) return;
    const { variant, method } = pending;
    setLoading(true);
    setError(null);
    setStep("redirecting");
    setPending(null);
    try {
      const res = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({
          email:         email.trim(),
          variantId:     variant.id,
          paymentMethod: method.id,
        }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || dict.errors.generic);
      setStep("method");
    } catch {
      setError(dict.errors.network);
      setStep("method");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setUser(null);
    setSelectedVariant(null);
    setError(null);
  }

  return (
    <div className="sticker rounded-lg p-5 sm:p-7">
      <StepIndicator step={step} dict={dict} />

      {step === "email" && (
        <form onSubmit={handleCheckEmail} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">
              {dict.form.emailLabel}
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.form.emailPlaceholder}
              className={inputClass}
            />
          </label>
          {error && <ErrorBox>{error}</ErrorBox>}
          <PrimaryButton type="submit" disabled={loading || !email}>
            {loading ? dict.form.checking : dict.form.checkEmail}
          </PrimaryButton>
        </form>
      )}

      {step === "duration" && user && (
        <div className="space-y-5">
          <UserCard user={user} email={email} onBack={handleBackToEmail} dict={dict} locale={locale} />
          <div>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">
              {dict.form.chooseDuration}
            </h2>
            <div className="grid gap-2.5">
              {variants.map((v) => (
                <VariantButton
                  key={v.id}
                  variant={v}
                  disabled={loading}
                  onClick={() => handleSelectVariant(v)}
                  dict={dict}
                  locale={locale}
                />
              ))}
            </div>
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
        </div>
      )}

      {step === "method" && user && selectedVariant && (
        <div className="space-y-5">
          <UserCard user={user} email={email} onBack={handleBackToEmail} dict={dict} locale={locale} />
          <SelectedVariantCard
            variant={selectedVariant}
            onChange={handleBackToDuration}
            dict={dict}
            locale={locale}
          />
          <div>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">
              {dict.form.choosePayment}
            </h2>
            <p className="mb-3 text-[11.5px] leading-relaxed text-fg-light-mute">
              {dict.form.paymentHint}
            </p>
            {paymentMethods.length === 0 ? (
              <ErrorBox>{dict.form.methodUnavailable}</ErrorBox>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {paymentMethods.map((m) => (
                  <MethodButton
                    key={m.id}
                    method={m}
                    base={selectedVariant.priceTHBSatang}
                    disabled={loading}
                    onClick={() => handleSelectMethod(m)}
                    dict={dict}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
        </div>
      )}

      {step === "redirecting" && (
        <div className="py-14 text-center">
          <Spinner />
          <p className="mt-4 text-[13px] text-fg-light-soft">{dict.form.redirecting}</p>
        </div>
      )}

      {pending && user && (
        <ConfirmModal
          variant={pending.variant}
          method={pending.method}
          user={user}
          email={email}
          dict={dict}
          locale={locale}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

/** Compact recap of the variant the user just picked, with a Change
 *  button that drops them back to the duration step. Mirrors UserCard's
 *  visual style so steps 2 and 3 share a consistent "stacked context"
 *  feeling. */
function SelectedVariantCard({
  variant,
  onChange,
  dict,
  locale,
}: {
  variant:  Variant;
  onChange: () => void;
  dict:     Dict;
  locale:   Locale;
}) {
  const baht = (variant.priceTHBSatang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return (
    <div className="rounded-md border border-line-light bg-paper-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">
            {dict.confirm.durationLabel}
          </p>
          <p className="mt-1 text-[16px] font-extrabold text-fg-light">
            {variantLabel(variant, locale)}
          </p>
          <p className="mt-0.5 text-[11px] text-fg-light-mute">
            {dict.form.extendDays.replace("{days}", String(variant.durationDays))} · ฿{baht}
          </p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold text-pink-400 tint-soft tint-soft-hover"
        >
          {dict.form.change}
        </button>
      </div>
    </div>
  );
}

function UserCard({
  user,
  email,
  onBack,
  dict,
  locale,
}: {
  user:   CheckedUser;
  email:  string;
  onBack: () => void;
  dict:   Dict;
  locale: Locale;
}) {
  const active = user.proActive && user.proExpireAt;
  return (
    <div className="rounded-md border border-line-light bg-paper-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-light-mute">
            {dict.user.accountLabel}
          </p>
          <p className="mt-1 truncate text-[16px] font-extrabold text-fg-light">
            @{user.username}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-fg-light-mute">{email}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold text-pink-400 tint-soft tint-soft-hover"
        >
          {dict.form.change}
        </button>
      </div>
      <div className="mt-3 border-t border-line-light pt-3 text-[12px]">
        {active ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-light-soft">
            <span className="font-semibold text-fg-light">{dict.user.expiresLabel}:</span>
            <span>{formatDateTime(user.proExpireAt!, locale)}</span>
            <Badge tone="ok">{dict.user.active}</Badge>
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-light-soft">
            <span className="font-semibold text-fg-light">{dict.user.statusLabel}:</span>
            <span>{dict.user.neverPro}</span>
            <Badge tone="mute">{dict.user.inactive}</Badge>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Confirmation modal ─────────────────────────────────────

function ConfirmModal({
  variant,
  method,
  user,
  email,
  dict,
  locale,
  loading,
  onConfirm,
  onCancel,
}: {
  variant: Variant;
  method:  PaymentMethod;
  user:    CheckedUser;
  email:   string;
  dict:    Dict;
  locale:  Locale;
  loading: boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  // Lock body scroll + ESC to close while the modal is open. Restoring
  // overflow on unmount is important — without it a Stripe redirect
  // that fails mid-flight would leave the page un-scrollable.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [loading, onCancel]);

  const fee   = feeSatang(variant.priceTHBSatang, method.feeBps);
  const total = variant.priceTHBSatang + fee;

  const fmtTHB = (sat: number) =>
    (sat / 100).toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  const baseBaht  = fmtTHB(variant.priceTHBSatang);
  const feeBaht   = fmtTHB(fee);
  const totalBaht = fmtTHB(total);

  // USD parenthetical scales with the actual total (base + fee) so
  // international users see what they'll really be charged on their
  // card statement — Stripe still settles in THB, but the rate is
  // shown for orientation.
  const usd = variant.priceUSDCents !== null
    ? ((variant.priceUSDCents * total) / variant.priceTHBSatang / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  const percent = (method.feeBps / 100).toLocaleString(INTL_LOCALE[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const planName   = variantLabel(variant, locale);
  const methodName = methodLabel(method, locale);

  // Compute the new Pro period CLIENT-SIDE for preview only. This is
  // a best-effort projection — the authoritative calculation happens
  // server-side in the webhook against fresh findUserByEmail data, so
  // if the customer renews elsewhere between now and payment the
  // server might extend by a slightly different range. Acceptable
  // because the modal is shown for seconds before checkout.
  const now = new Date();
  const oldExpireDate = user.proExpireAt ? new Date(user.proExpireAt) : null;
  const stacked = !!(
    user.proActive && oldExpireDate && oldExpireDate.getTime() > now.getTime()
  );
  const startsAt = stacked ? oldExpireDate! : now;
  const endsAt = new Date(startsAt.getTime() + variant.durationDays * 86_400_000);

  // Portal to document.body so ancestors with `transform` (our
  // anim-fade-up sections) don't reframe `position: fixed` and pull
  // the modal off-center. Portal target is guaranteed because this
  // component is only mounted after a user click — never during SSR.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={dict.confirm.cancelBtn}
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-bg-1000/70 backdrop-blur-sm anim-fade-in"
      />

      {/* Sheet / dialog */}
      <div
        className={cn(
          "sticker relative z-10 w-full max-w-lg p-7 sm:p-8 anim-scale-in",
          // Mobile = bottom sheet (full width, rounded only on top).
          // Desktop = centred dialog with breathing room and rounded
          // corners on all four sides.
          "mx-0 mb-0 rounded-t-xl rounded-b-none sm:m-4 sm:rounded-xl",
        )}
      >
        <h2
          id="confirm-title"
          className="font-display text-[22px] font-extrabold text-fg-light sm:text-[24px]"
        >
          {dict.confirm.title}
        </h2>
        <p className="mt-1.5 text-[13px] text-fg-light-soft">{dict.confirm.body}</p>

        <dl className="mt-6 space-y-3 rounded-md bg-paper-2 p-5 text-[14px]">
          <ConfirmRow label={dict.confirm.accountLabel}  value={`@${user.username}`} hint={email} />
          <ConfirmRow
            label={dict.confirm.durationLabel}
            value={planName}
            hint={`${variant.durationDays} ${dict.confirm.daysSuffix}`}
          />
          <ConfirmRow
            label={dict.confirm.methodLabel}
            value={methodName}
            hint={
              method.feeBps === 0
                ? dict.form.noFee
                : dict.form.feePercent.replace("{percent}", percent)
            }
          />

          <div className="border-t border-line-light pt-3">
            <PeriodBlock
              startsAt={startsAt}
              endsAt={endsAt}
              stacked={stacked}
              dict={dict}
              locale={locale}
            />
          </div>

          <div className="border-t border-line-light pt-3 space-y-1.5">
            {fee > 0 && (
              <>
                <div className="flex items-center justify-between text-[12.5px] text-fg-light-soft">
                  <span>{dict.confirm.baseLabel}</span>
                  <span className="tabular-nums">฿{baseBaht}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] text-fg-light-soft">
                  <span>{dict.confirm.feeLabel} ({percent}%)</span>
                  <span className="tabular-nums">฿{feeBaht}</span>
                </div>
              </>
            )}
            <ConfirmRow
              label={dict.confirm.totalLabel}
              value={`฿${totalBaht}`}
              hint={usd ? `≈ $${usd}` : undefined}
              highlight
            />
          </div>
        </dl>

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-pill border border-line-light px-5 py-3 text-[14px] font-bold text-fg-light tint-soft tint-soft-hover disabled:opacity-60"
          >
            {dict.confirm.cancelBtn}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-pill bg-pink-500 px-5 py-3 text-[14px] font-extrabold uppercase tracking-[0.08em] text-white",
              "shadow-[0_3px_0_var(--pink-600),0_10px_28px_-8px_hsl(330_80%_50%/0.45)]",
              "transition-transform duration-fast ease-spring hover:-translate-y-0.5 active:translate-y-0.5",
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0",
            )}
          >
            {loading ? "…" : dict.confirm.confirmBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmRow({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-fg-light-mute">{label}</dt>
      <dd
        className={
          (highlight ? "text-[22px] font-extrabold text-pink-400 leading-tight " : "text-fg-light font-semibold ") +
          "text-right"
        }
      >
        {value}
        {hint && <div className="mt-0.5 text-[11px] font-normal text-fg-light-mute">{hint}</div>}
      </dd>
    </div>
  );
}

/** Vertical block that walks the customer through the new Pro period:
 *  what date it begins, what date it ends, and a small badge that says
 *  "stacks on remaining days" when applicable. More verbose than a
 *  single Total Days row, but the extra space buys clarity on the one
 *  question customers actually ask: when does my Pro run out? */
function PeriodBlock({
  startsAt,
  endsAt,
  stacked,
  dict,
  locale,
}: {
  startsAt: Date;
  endsAt:   Date;
  stacked:  boolean;
  dict:     Dict;
  locale:   Locale;
}) {
  return (
    <div>
      <p className="text-fg-light-mute">{dict.confirm.periodLabel}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-paper p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fg-light-mute">
            {dict.confirm.startsLabel}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-fg-light">
            {stacked ? formatDateTime(startsAt.toISOString(), locale) : dict.confirm.startsToday}
          </p>
          {stacked && (
            <p className="mt-0.5 text-[10px] text-cyan-400">{dict.confirm.stackedNote}</p>
          )}
        </div>
        <div className="rounded-md bg-paper p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fg-light-mute">
            {dict.confirm.endsLabel}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-pink-400">
            {formatDateTime(endsAt.toISOString(), locale)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

function StepIndicator({ step, dict }: { step: Step; dict: Dict }) {
  const items: { key: Step; label: string }[] = [
    { key: "email",        label: dict.step.email },
    { key: "duration",     label: dict.step.duration },
    { key: "method",       label: dict.step.method },
    { key: "redirecting",  label: dict.step.pay },
  ];
  const activeIdx = items.findIndex((i) => i.key === step);

  return (
    <ol className="mb-6 flex items-center justify-center gap-1.5 text-[11px]">
      {items.map((item, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-pill text-[10px] font-extrabold transition",
                done
                  ? "bg-cyan-500 text-bg-1000"
                  : active
                  ? "bg-pink-500 text-white"
                  : "bg-paper-3 text-fg-light-mute",
              )}
            >
              {done ? <CheckSmall /> : i + 1}
            </span>
            <span
              className={cn(
                "font-bold uppercase tracking-[0.12em] transition",
                active || done ? "text-fg-light" : "text-fg-light-mute",
              )}
            >
              {item.label}
            </span>
            {i < items.length - 1 && <span className="ml-1 h-px w-4 bg-line-light" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function VariantButton({
  variant,
  disabled,
  onClick,
  dict,
  locale,
}: {
  variant:  Variant;
  disabled: boolean;
  onClick:  () => void;
  dict:     Dict;
  locale:   Locale;
}) {
  const baht = (variant.priceTHBSatang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const usd = variant.priceUSDCents !== null
    ? (variant.priceUSDCents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;
  const recommended = variant.durationDays === 30;
  const planName = variantLabel(variant, locale);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between rounded-md border-2 bg-paper-2 px-4 py-3.5 text-left transition",
        "border-line-light hover:border-pink-400",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {recommended && (
        <span className="absolute -top-2 left-3 rounded-pill bg-cyan-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-bg-1000">
          {dict.form.recommended}
        </span>
      )}
      <div>
        <p className="font-extrabold text-fg-light">{planName}</p>
        <p className="mt-0.5 text-[11px] text-fg-light-mute">
          {dict.form.extendDays.replace("{days}", String(variant.durationDays))}
        </p>
      </div>
      <div className="text-right leading-tight">
        <p className="text-[20px] font-extrabold text-pink-400 tabular-nums">฿{baht}</p>
        {usd && <p className="text-[10px] tabular-nums text-fg-light-mute">≈ ${usd}</p>}
        <p className="text-[10px] text-fg-light-mute">{dict.form.perOrder}</p>
      </div>
    </button>
  );
}

/** Payment-method card. Shows label + fee badge + the final total
 *  for THIS variant when paid via THIS method, so the customer can
 *  compare side-by-side without doing the math in their head. */
function MethodButton({
  method,
  base,
  disabled,
  onClick,
  dict,
  locale,
}: {
  method:   PaymentMethod;
  base:     number;
  disabled: boolean;
  onClick:  () => void;
  dict:     Dict;
  locale:   Locale;
}) {
  const fee   = feeSatang(base, method.feeBps);
  const total = base + fee;
  const baht = (total / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const percent = (method.feeBps / 100).toLocaleString(INTL_LOCALE[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const isPromptPay = method.id === "promptpay";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col justify-between rounded-md border-2 bg-paper-2 p-4 text-left transition",
        "border-line-light hover:border-pink-400",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <MethodIcon kind={method.id} />
          <span className="font-extrabold text-fg-light">{methodLabel(method, locale)}</span>
        </div>
        <p
          className={cn(
            "mt-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]",
            method.feeBps === 0
              ? "bg-ok/15 text-ok"
              : "bg-warn/15 text-warn",
          )}
        >
          {method.feeBps === 0
            ? dict.form.noFee
            : dict.form.feePercent.replace("{percent}", percent)}
        </p>
        {isPromptPay && (
          <p className="mt-2 text-[10.5px] leading-relaxed text-fg-light-mute">
            QR code · Mobile banking
          </p>
        )}
      </div>
      <div className="mt-3 border-t border-line-light pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fg-light-mute">
          {dict.form.totalLabel}
        </p>
        <p className="mt-0.5 text-[20px] font-extrabold leading-tight text-pink-400 tabular-nums">
          ฿{baht}
        </p>
      </div>
    </button>
  );
}

function MethodIcon({ kind }: { kind: string }) {
  if (kind === "promptpay") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-500/15 text-cyan-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3"  width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M20 14v.01M14 20v.01M17 20h4M20 17v4" />
        </svg>
      </span>
    );
  }
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-pink-500/15 text-pink-300">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    </span>
  );
}

function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "w-full rounded-pill bg-pink-500 px-5 py-3 text-[14px] font-extrabold uppercase tracking-[0.12em] text-white",
        "shadow-[0_3px_0_var(--pink-600),0_10px_28px_-8px_hsl(330_80%_50%/0.45)]",
        "transition-transform duration-fast ease-spring hover:-translate-y-0.5 active:translate-y-0.5",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0",
      )}
    >
      {children}
    </button>
  );
}

function Badge({ tone, children }: { tone: "ok" | "mute"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]",
        tone === "ok"   ? "bg-ok/15  text-ok"
                        : "bg-paper-3 text-fg-light-mute",
      )}
    >
      {children}
    </span>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12.5px] text-bad"
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="mx-auto h-9 w-9 animate-spin rounded-pill border-[3px] border-pink-500/20 border-t-pink-500"
      aria-label="loading"
    />
  );
}

function CheckSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inputClass = cn(
  "w-full rounded-md border border-line-light bg-paper-2 px-3.5 py-2.5 text-[14px] text-fg-light",
  "outline-none transition-colors duration-fast",
  "focus:border-pink-400 focus:ring-4 focus:ring-pink-400/15",
  "placeholder:text-fg-light-mute",
);

/** Locale-aware date+time. Used everywhere the customer sees a date —
 *  the previous implementation hard-coded th-TH so EN users saw Thai
 *  Buddhist-calendar dates. Always pass the locale prop, never read
 *  navigator.language at runtime (would diverge from server render). */
function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
