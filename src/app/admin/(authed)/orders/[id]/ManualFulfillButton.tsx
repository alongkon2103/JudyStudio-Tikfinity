"use client";

import { useState, useTransition } from "react";
import { manualFulfillOrder } from "./actions";

export function ManualFulfillButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function onClick() {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      const r = await manualFulfillOrder(orderId);
      setResult(r);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md bg-pink-500 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-pink-600 disabled:opacity-60"
      >
        {pending ? "กำลังต่ออายุ…" : "ต่ออายุด้วยมือ (Retry)"}
      </button>
      {result && (
        <p className={`mt-2 text-[11px] ${result.ok ? "text-ok" : "text-bad"}`}>
          {result.ok ? "✓ ต่ออายุสำเร็จ" : `✗ ${result.error ?? "เกิดข้อผิดพลาด"}`}
        </p>
      )}
    </div>
  );
}
