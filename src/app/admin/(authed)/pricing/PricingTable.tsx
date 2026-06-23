"use client";

import { useState, useTransition } from "react";
import { updateVariant, fetchUsdFromTHB } from "./actions";

type Variant = {
  id:             string;
  durationDays:   number;
  label:          string;
  labelEn:        string | null;
  priceTHBSatang: number;
  priceUSDCents:  number | null;
  costTHBSatang:  number;
  isActive:       boolean;
};

export function PricingTable({
  variants,
  liveRates,
}: {
  variants:  Variant[];
  /** Reseller-side cost from /history, in whole baht. Used to flag
   *  drift between our `cost` snapshot and Tikfinity's current rate. */
  liveRates: Record<string, number> | null;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {variants.map((v) => (
        <VariantCard
          key={v.id}
          variant={v}
          liveCostBaht={liveRates?.[String(v.durationDays)] ?? null}
        />
      ))}
    </div>
  );
}

function VariantCard({
  variant,
  liveCostBaht,
}: {
  variant:      Variant;
  liveCostBaht: number | null;
}) {
  const [label, setLabel]         = useState(variant.label);
  const [labelEn, setLabelEn]     = useState(variant.labelEn ?? "");
  const [priceBaht, setPriceBaht] = useState((variant.priceTHBSatang / 100).toString());
  const [priceUsd, setPriceUsd]   = useState(
    variant.priceUSDCents !== null ? (variant.priceUSDCents / 100).toFixed(2) : "",
  );
  const [isActive, setIsActive]   = useState(variant.isActive);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch USD state. Track the FX rate + date that produced the
  // current value so admin can sanity-check ตอนเทียบราคาตลาด.
  const [fxFetching, startFx]  = useTransition();
  const [fxInfo, setFxInfo]    = useState<{ rate: number; date: string } | null>(null);
  const [fxError, setFxError]  = useState<string | null>(null);

  const costBaht       = variant.costTHBSatang / 100;
  const driftFromLive  = liveCostBaht !== null && liveCostBaht !== costBaht;
  const priceNumber    = Number(priceBaht);
  const usdNumber      = priceUsd.trim() === "" ? null : Number(priceUsd);
  const profitPerOrder = Number.isFinite(priceNumber) ? priceNumber - costBaht : 0;

  // True when any field differs from what's persisted. Drives the
  // visibility of the save button — if nothing changed, no button.
  // Less visual chrome on the page → admin scans the cards faster.
  const initialUsdStr =
    variant.priceUSDCents !== null ? (variant.priceUSDCents / 100).toFixed(2) : "";
  const isDirty =
    label !== variant.label ||
    labelEn !== (variant.labelEn ?? "") ||
    priceBaht !== (variant.priceTHBSatang / 100).toString() ||
    priceUsd !== initialUsdStr ||
    isActive !== variant.isActive;

  function onAutoFetchUsd() {
    setFxError(null);
    if (!Number.isFinite(priceNumber) || priceNumber < 1) {
      setFxError("ตั้งราคา THB ก่อน");
      return;
    }
    startFx(async () => {
      const res = await fetchUsdFromTHB(Math.round(priceNumber * 100));
      if (res.ok) {
        setPriceUsd((res.usdCents / 100).toFixed(2));
        setFxInfo({ rate: res.rate, date: res.date });
      } else {
        setFxError(`ดึงไม่สำเร็จ: ${res.error}`);
      }
    });
  }

  function onSave() {
    if (pending) return;
    setError(null);
    if (!label.trim()) { setError("กรุณาใส่ชื่อภาษาไทย"); return; }
    if (!Number.isFinite(priceNumber) || priceNumber < 1) {
      setError("ราคา THB ต้องเป็นตัวเลขอย่างน้อย 1 บาท"); return;
    }
    if (usdNumber !== null && (!Number.isFinite(usdNumber) || usdNumber <= 0)) {
      setError("ราคา USD ต้องเป็นตัวเลขมากกว่า 0 (เว้นว่างเพื่อไม่แสดง)"); return;
    }
    startTransition(async () => {
      const res = await updateVariant({
        id:             variant.id,
        label:          label.trim(),
        labelEn:        labelEn.trim() || null,
        priceTHBSatang: Math.round(priceNumber * 100),
        priceUSDCents:  usdNumber !== null ? Math.round(usdNumber * 100) : null,
        isActive,
      });
      if (res.ok) setSavedAt(Date.now());
      else setError(res.error ?? "บันทึกไม่สำเร็จ");
    });
  }

  return (
    <div className="flex flex-col rounded-md border border-line-dark bg-paper">
      <header className="flex items-center justify-between border-b border-line-dark-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-extrabold tabular-nums text-fg-dark">
            {variant.durationDays}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dark-mute">
            days
          </span>
        </div>
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label={isActive ? "Active" : "Inactive"}
        />
      </header>

      {/* Names */}
      <div className="grid gap-3 border-b border-line-dark-2 px-4 py-3 sm:grid-cols-2">
        <Field label="ชื่อ (ไทย)" required>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="3 วัน"
            className={inputClass}
          />
        </Field>
        <Field label="ชื่อ (English)">
          <input
            type="text"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            maxLength={80}
            placeholder="3 days"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Prices */}
      <div className="grid gap-3 border-b border-line-dark-2 px-4 py-3 sm:grid-cols-2">
        <Field label="ราคาขาย (THB)" required>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dark-mute">฿</span>
            <input
              type="number"
              min={1}
              step="1"
              value={priceBaht}
              onChange={(e) => setPriceBaht(e.target.value)}
              className={inputClass + " pl-7 text-right tabular-nums"}
            />
          </div>
        </Field>
        <Field label="ราคา (USD ref)">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dark-mute">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                placeholder="optional"
                className={inputClass + " pl-7 text-right tabular-nums"}
              />
            </div>
            <button
              type="button"
              onClick={onAutoFetchUsd}
              disabled={fxFetching || pending}
              title="คำนวณจากราคา THB ด้วยอัตราแลกเปลี่ยน ECB"
              className="inline-flex items-center gap-1 rounded-md border border-line-dark bg-paper-2 px-2.5 py-1.5 text-[11px] font-bold text-fg-dark-soft hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-60"
            >
              <RefreshIcon spinning={fxFetching} />
              {fxFetching ? "…" : "Auto"}
            </button>
          </div>
          {fxInfo && !fxError && (
            <p className="mt-1 text-[10px] text-fg-dark-mute tabular-nums">
              1 THB = ${fxInfo.rate.toFixed(5)} · ECB {fxInfo.date}
            </p>
          )}
          {fxError && (
            <p className="mt-1 text-[10px] text-bad">{fxError}</p>
          )}
        </Field>
      </div>

      {/* Cost + profit summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[11px]">
        <span className="text-fg-dark-mute">
          Cost snapshot: <span className="tabular-nums text-fg-dark-soft">฿{costBaht.toLocaleString("th-TH")}</span>
        </span>
        {liveCostBaht !== null && (
          <span className={driftFromLive ? "text-warn" : "text-fg-dark-mute"}>
            Live: <span className="tabular-nums">฿{liveCostBaht.toLocaleString("th-TH")}</span>
            {driftFromLive && " ⚠"}
          </span>
        )}
        <span className="ml-auto">
          <span className="text-fg-dark-mute">กำไร / order: </span>
          <span className={"font-extrabold tabular-nums " + (profitPerOrder > 0 ? "text-ok" : "text-bad")}>
            ฿{profitPerOrder.toLocaleString("th-TH")}
          </span>
        </span>
      </div>

      {/* Save footer — only mounted when there's something to react to:
          unsaved edits, an in-flight save, an error, or a recent ✓ ack.
          On the cold state (4 unedited cards) the footer is gone and the
          page reads as a clean overview. */}
      {(isDirty || pending || error || savedAt) && (
        <footer className="flex items-center justify-between gap-3 border-t border-line-dark-2 bg-paper-2 px-4 py-2.5">
          <div className="text-[11px]">
            {error && <span className="text-bad">{error}</span>}
            {!error && !isDirty && savedAt && !pending && (
              <span className="text-ok">✓ บันทึกแล้ว</span>
            )}
            {!error && isDirty && (
              <span className="text-fg-dark-mute">มีการแก้ไขที่ยังไม่บันทึก</span>
            )}
          </div>
          {(isDirty || pending) && (
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-md bg-pink-500 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-pink-600 disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

/** iOS-style toggle. Pure CSS (no library) — `role="switch"` so screen
 *  readers announce it correctly, and the label sits BESIDE the switch
 *  so it stays clickable as part of the same button hit area. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
  label:    string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[11px] font-semibold"
    >
      <span
        className={
          "relative inline-flex h-5 w-9 items-center rounded-pill transition-colors duration-fast " +
          (checked ? "bg-pink-500" : "bg-paper-3")
        }
      >
        <span
          className={
            "inline-block h-3.5 w-3.5 transform rounded-pill bg-white shadow transition-transform duration-fast " +
            (checked ? "translate-x-[18px]" : "translate-x-[3px]")
          }
        />
      </span>
      <span className={checked ? "text-fg-dark" : "text-fg-dark-mute"}>{label}</span>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label:    string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-fg-dark-mute">
        {label}
        {required && <span className="ml-1 text-bad">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-line-dark bg-paper-2 px-3 py-1.5 text-[13px] text-fg-dark outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
      aria-hidden
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
