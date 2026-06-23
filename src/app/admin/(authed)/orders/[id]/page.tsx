import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/StatusPill";
import { ManualFulfillButton } from "./ManualFulfillButton";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await db.order.findUnique({ where: { id: params.id } });
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-[11px] text-fg-dark-mute hover:text-pink-400">
        ← Orders
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-fg-dark">
            Order <span className="font-mono text-fg-dark-soft">{order.id.slice(-8)}</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-fg-dark-mute">
            {order.createdAt.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="ลูกค้า">
          <Row label="Email"    value={order.tikfinityEmail} />
          <Row label="Username" value={order.username ? `@${order.username}` : "—"} />
          <Row label="Channel"  value={order.channelId} mono />
        </Card>

        <Card title="แพ็กเกจ">
          <Row label="ระยะเวลา"   value={`${order.durationDays} วัน`} />
          <Row label="ราคา"      value={`฿${(order.priceTHBSatang / 100).toLocaleString("th-TH")}`} />
          {order.feeSatang > 0 && (
            <Row
              label="ค่าธรรมเนียม"
              value={`฿${(order.feeSatang / 100).toLocaleString("th-TH")}`}
            />
          )}
          <Row
            label="ยอดรวม"
            value={`฿${((order.priceTHBSatang + order.feeSatang) / 100).toLocaleString("th-TH")}`}
            highlight
          />
          <Row
            label="ช่องทาง"
            value={methodDisplay(order.paymentMethod)}
          />
          <Row label="Stripe id" value={order.stripeSessionId ?? "—"} mono />
        </Card>

        <Card title="หมดอายุ">
          <Row
            label="เดิม"
            value={order.oldExpireAt
              ? order.oldExpireAt.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })
              : "ไม่เคยเป็น Pro"}
          />
          <Row
            label="ใหม่"
            value={order.newExpireAt
              ? order.newExpireAt.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })
              : "—"}
            highlight
          />
          <Row
            label="ต่ออายุเมื่อ"
            value={order.fulfilledAt
              ? order.fulfilledAt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
              : "—"}
          />
        </Card>

        <Card title="Fulfillment">
          <Row label="Attempts" value={String(order.fulfillmentAttempts)} />
          <Row label="Error"    value={order.fulfillmentError ?? "—"} mono />
          {(order.status === "FAILED" || order.status === "PAID") && (
            <div className="mt-3 border-t border-line-dark-2 pt-3">
              <ManualFulfillButton orderId={order.id} />
              <p className="mt-1 text-[10px] text-fg-dark-mute">
                เรียก setProExpire อีกครั้ง — idempotent หาก FULFILLED แล้วจะข้าม
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Human-readable payment method label keyed off the same vocabulary
 *  the checkout API speaks ("card" / "promptpay"). Falls through to
 *  the raw id for any future method we forget to translate. */
function methodDisplay(id: string): string {
  if (id === "card")      return "บัตรเครดิต / เดบิต";
  if (id === "promptpay") return "PromptPay";
  return id;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line-dark bg-paper p-4">
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-dark-mute">{title}</h2>
      <dl className="space-y-2 text-[13px]">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-fg-dark-mute">{label}</dt>
      <dd className={
        (highlight ? "font-extrabold text-pink-400 " : "text-fg-dark ") +
        (mono ? "font-mono text-[11px] break-all" : "")
      }>
        {value}
      </dd>
    </div>
  );
}
