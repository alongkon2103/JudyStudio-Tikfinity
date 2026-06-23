import Link from "next/link";
import { db } from "@/lib/db";
import {
  getResellerInfo,
  type Result,
  type TikfinityResellerInfo,
} from "@/lib/tikfinity";
import { StatusPill } from "@/components/StatusPill";
import { RevenueChart } from "./_components/RevenueChart";
import { VariantMixChart } from "./_components/VariantMixChart";

export const dynamic = "force-dynamic";

const DAYS_WINDOW = 14;

export default async function AdminDashboard() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS_WINDOW - 1));

  const [resellerInfo, recentOrders, statusCounts, windowOrders] =
    await Promise.all([
      getResellerInfo(),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take:    8,
        select:  {
          id:             true,
          tikfinityEmail: true,
          username:       true,
          durationDays:   true,
          priceTHBSatang: true,
          status:         true,
          createdAt:      true,
        },
      }),
      db.order.groupBy({ by: ["status"], _count: { _all: true } }),
      db.order.findMany({
        where: { status: "FULFILLED", createdAt: { gte: since } },
        select: { createdAt: true, priceTHBSatang: true, durationDays: true },
      }),
    ]);

  const statusMap = Object.fromEntries(
    statusCounts.map((row) => [row.status, row._count._all]),
  );

  const revenueSeries = buildDailyRevenue(windowOrders, since, DAYS_WINDOW);
  const variantMix    = buildVariantMix(windowOrders);
  const totalRevenue  = windowOrders.reduce((s, o) => s + o.priceTHBSatang, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-fg-dark">Dashboard</h1>
          <p className="mt-0.5 text-[12px] text-fg-dark-mute">ภาพรวม {DAYS_WINDOW} วันล่าสุด</p>
        </div>
      </header>

      {/* ── Tikfinity Reseller — live numbers from /history ── */}
      <ResellerPanel info={resellerInfo} />

      {/* ── Order stats row ──────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={`Revenue · ${DAYS_WINDOW}d`}
          value={`฿${(totalRevenue / 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
          hint={`${windowOrders.length} fulfilled`}
          accent="cyan"
        />
        <Stat label="Fulfilled" value={String(statusMap.FULFILLED ?? 0)} hint="success" accent="pink" />
        <Stat label="Paid"      value={String(statusMap.PAID      ?? 0)} hint="processing" />
        <Stat label="Failed"    value={String(statusMap.FAILED    ?? 0)} hint="needs retry" accent={statusMap.FAILED ? "bad" : undefined} />
      </section>

      {/* ── Charts row ───────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue" subtitle={`Daily fulfilled · last ${DAYS_WINDOW} days`}>
          <RevenueChart data={revenueSeries} />
        </Panel>
        <Panel title="Variant mix" subtitle={`${windowOrders.length} fulfilled · last ${DAYS_WINDOW}d`}>
          <VariantMixChart data={variantMix} />
        </Panel>
      </section>

      {/* ── Recent orders ────────────────────────────────── */}
      <section className="rounded-md border border-line-dark bg-paper">
        <header className="flex items-center justify-between border-b border-line-dark px-4 py-2.5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-fg-dark-mute">
            Recent orders
          </h2>
          <Link
            href="/admin/orders"
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-pink-400 hover:bg-paper-3"
          >
            View all →
          </Link>
        </header>
        {recentOrders.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-fg-dark-mute">ยังไม่มี order</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-fg-dark-mute">
              <tr>
                <th className="px-4 py-2">เวลา</th>
                <th className="px-4 py-2">Email / User</th>
                <th className="px-4 py-2 text-right">วัน</th>
                <th className="px-4 py-2 text-right">ราคา</th>
                <th className="px-4 py-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-line-dark-2 hover:bg-paper-2">
                  <td className="px-4 py-2.5 text-[11px] text-fg-dark-mute tabular-nums">
                    {o.createdAt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-fg-dark hover:text-pink-400">
                      {o.tikfinityEmail}
                    </Link>
                    {o.username && <span className="ml-2 text-[11px] text-fg-dark-mute">@{o.username}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{o.durationDays}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    ฿{(o.priceTHBSatang / 100).toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

/** Tikfinity Reseller — live snapshot. Renders the three account
 *  numbers (credits / points / activations) prominently plus a
 *  one-line rates strip so admin can sanity-check ตอนเทียบกับราคาขาย. */
function ResellerPanel({ info }: { info: Result<TikfinityResellerInfo> }) {
  if (!info.ok) {
    return (
      <section className="rounded-md border border-bad/40 bg-bad/10 p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-bad">
          Tikfinity Reseller · offline
        </h2>
        <p className="mt-1 text-[12px] text-fg-dark-soft">{info.message}</p>
      </section>
    );
  }

  const { credits, totalPoints, activationCounter, rates } = info.data;
  const sortedRates = Object.entries(rates)
    .map(([k, v]) => ({ days: Number(k), baht: v }))
    .filter((r) => Number.isFinite(r.days))
    .sort((a, b) => a.days - b.days);

  return (
    <section className="rounded-md border border-line-dark bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-fg-dark-mute">
          Tikfinity Reseller
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ok">
          <span className="h-1.5 w-1.5 rounded-pill bg-ok" /> live
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line-dark-2 rounded-md bg-paper-2">
        <ResellerStat label="Credits"     value={`฿${credits.toLocaleString("th-TH")}`} accent="pink" />
        <ResellerStat label="Points"      value={totalPoints.toLocaleString("th-TH")}   accent="cyan" />
        <ResellerStat label="Activations" value={String(activationCounter)} />
      </div>

      {sortedRates.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-dark-mute">
          <span className="font-semibold uppercase tracking-[0.14em]">Rates</span>
          {sortedRates.map((r) => (
            <span key={r.days} className="tabular-nums">
              <span className="text-fg-dark-soft">{r.days}d</span> <span className="font-semibold text-fg-dark">฿{r.baht.toLocaleString("th-TH")}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ResellerStat({
  label,
  value,
  accent,
}: {
  label:  string;
  value:  string;
  accent?: "pink" | "cyan";
}) {
  const accentClass =
    accent === "pink" ? "text-pink-400" :
    accent === "cyan" ? "text-cyan-400" :
    "text-fg-dark";
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-dark-mute">{label}</p>
      <p className={`mt-1 text-[24px] font-extrabold leading-none tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title:    string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line-dark bg-paper p-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-bold text-fg-dark">{title}</h2>
        <p className="text-[11px] text-fg-dark-mute">{subtitle}</p>
      </header>
      <div>{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label:  string;
  value:  string;
  hint?:  string;
  accent?: "pink" | "cyan" | "bad";
}) {
  const accentClass =
    accent === "pink" ? "text-pink-400" :
    accent === "cyan" ? "text-cyan-400" :
    accent === "bad"  ? "text-bad"      :
    "text-fg-dark";

  return (
    <div className="rounded-md border border-line-dark bg-paper p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-dark-mute">{label}</p>
      <p className={`mt-1.5 text-[22px] font-extrabold leading-tight tabular-nums ${accentClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-fg-dark-mute">{hint}</p>}
    </div>
  );
}

// ─── Aggregation helpers ───────────────────────────────────

function buildDailyRevenue(
  orders: { createdAt: Date; priceTHBSatang: number }[],
  since:  Date,
  days:   number,
): { date: string; baht: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(keyOfDay(d), 0);
  }
  for (const o of orders) {
    const k = keyOfDay(o.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.priceTHBSatang);
  }
  return Array.from(buckets, ([date, satang]) => ({
    date,
    baht: Math.round(satang / 100),
  }));
}

function buildVariantMix(
  orders: { durationDays: number }[],
): { days: number; count: number }[] {
  const map = new Map<number, number>();
  for (const o of orders) map.set(o.durationDays, (map.get(o.durationDays) ?? 0) + 1);
  return Array.from(map, ([days, count]) => ({ days, count })).sort((a, b) => a.days - b.days);
}

function keyOfDay(d: Date): string {
  // YYYY-MM-DD in local time — chart x-axis labels parse this back.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
