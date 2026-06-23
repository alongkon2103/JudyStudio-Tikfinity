"use client";

import { useState, useTransition } from "react";
import { updatePaymentMethod } from "./actions";

type Method = {
  id:           string;
  label:        string;
  labelEn:      string;
  /// Basis points — 600 = 6.00%.
  feeBps:       number;
  isActive:     boolean;
  displayOrder: number;
};

export function PaymentMethodsTable({ methods }: { methods: Method[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {methods.map((m) => (
        <MethodCard key={m.id} method={m} />
      ))}
    </div>
  );
}

function MethodCard({ method }: { method: Method }) {
  const [label, setLabel]     = useState(method.label);
  const [labelEn, setLabelEn] = useState(method.labelEn);
  // Edit as a percent string (e.g. "6.00") for ergonomics. We
  // convert to bps on save — that's the canonical unit on the DB
  // side. Allow 2 decimals to express the same precision as bps
  // (6.50% = 650 bps).
  const [feePct, setFeePct]   = useState((method.feeBps / 100).toString());
  const [isActive, setIsActive] = useState(method.isActive);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const initialPctStr = (method.feeBps / 100).toString();
  const isDirty =
    label    !== method.label ||
    labelEn  !== method.labelEn ||
    feePct   !== initialPctStr ||
    isActive !== method.isActive;

  function onSave() {
    if (pending) return;
    setError(null);
    if (!label.trim() || !labelEn.trim()) {
      setError("กรอกชื่อไทยและอังกฤษ"); return;
    }
    const pct = Number(feePct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("ค่าธรรมเนียมต้องอยู่ระหว่าง 0 – 100%"); return;
    }
    // Round-half-to-even via Math.round is fine here — bps already
    // gives us 4 decimal places, way more than admin will ever set.
    const feeBps = Math.round(pct * 100);
    startTransition(async () => {
      const res = await updatePaymentMethod({
        id:       method.id,
        label:    label.trim(),
        labelEn:  labelEn.trim(),
        feeBps,
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
          <span className="text-[15px] font-extrabold tabular-nums uppercase text-fg-dark">
            {method.id}
          </span>
        </div>
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label={isActive ? "Active" : "Inactive"}
        />
      </header>

      <div className="grid gap-3 border-b border-line-dark-2 px-4 py-3 sm:grid-cols-2">
        <Field label="ชื่อ (ไทย)" required>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="บัตรเครดิต / เดบิต"
            className={inputClass}
          />
        </Field>
        <Field label="ชื่อ (English)" required>
          <input
            type="text"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            maxLength={80}
            placeholder="Credit / Debit Card"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-3 border-b border-line-dark-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
        <Field label="ค่าธรรมเนียม (%)">
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              className={inputClass + " pr-7 text-right tabular-nums"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-dark-mute">
              %
            </span>
          </div>
        </Field>
        <Preview pct={Number(feePct)} />
      </div>

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

/** Live preview of what the customer sees on a 100฿ order, so admin
 *  has a sanity check before saving. 100฿ is a round number admin can
 *  re-divide mentally — easier than computing fee × 459฿ in their head. */
function Preview({ pct }: { pct: number }) {
  const valid = Number.isFinite(pct) && pct >= 0 && pct <= 100;
  if (!valid) return null;
  const base = 100; // baht
  const fee  = Math.floor((base * pct * 100) / 100) / 100;
  const total = base + fee;
  return (
    <div className="self-end rounded-md bg-paper-2 px-3 py-2 text-[10.5px] text-fg-dark-mute">
      <p>ตัวอย่าง ราคา 100฿</p>
      <p className="mt-0.5 font-semibold text-fg-dark-soft tabular-nums">
        + ฿{fee.toFixed(2)} = ฿{total.toFixed(2)}
      </p>
    </div>
  );
}

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
