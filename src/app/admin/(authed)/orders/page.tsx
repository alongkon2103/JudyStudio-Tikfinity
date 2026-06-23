import Link from "next/link";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const VALID_STATUSES = ["PAID", "FULFILLED", "FAILED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const statusFilter = VALID_STATUSES.includes(searchParams.status as ValidStatus)
    ? (searchParams.status as ValidStatus)
    : undefined;
  const q = searchParams.q?.trim().toLowerCase() ?? "";

  const orders = await db.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { tikfinityEmail: { contains: q, mode: "insensitive" } },
              { username:       { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take:    PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <h1 className="text-[20px] font-extrabold tracking-tight text-fg-dark">Orders</h1>
        <p className="text-[11px] text-fg-dark-mute">
          แสดง {orders.length} รายการล่าสุด (สูงสุด {PAGE_SIZE})
        </p>
      </header>

      <form className="flex flex-wrap items-center gap-2 rounded-md border border-line-dark bg-paper p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา email หรือ username…"
          className="min-w-[200px] flex-1 rounded-md border border-line-dark bg-paper-2 px-3 py-1.5 text-[13px] text-fg-dark placeholder:text-fg-dark-mute outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20"
        />
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-md border border-line-dark bg-paper-2 px-2 py-1.5 text-[13px] text-fg-dark outline-none focus:border-pink-400"
        >
          <option value="">ทุกสถานะ</option>
          {VALID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          type="submit"
          className="rounded-md bg-pink-500 px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-pink-600"
        >
          ค้นหา
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-line-dark bg-paper">
        <table className="w-full text-[13px]">
          <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-fg-dark-mute">
            <tr>
              <th className="px-4 py-2">เวลา</th>
              <th className="px-4 py-2">Email / User</th>
              <th className="px-4 py-2 text-right">วัน</th>
              <th className="px-4 py-2 text-right">ราคา</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2 text-right">หมดอายุใหม่</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-fg-dark-mute">ไม่พบ order</td>
              </tr>
            ) : (
              orders.map((o) => (
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
                    ฿{((o.priceTHBSatang + o.feeSatang) / 100).toLocaleString("th-TH")}
                    {o.feeSatang > 0 && (
                      <span className="ml-1 text-[10px] font-normal text-fg-dark-mute">
                        ({o.paymentMethod === "card" ? "card" : o.paymentMethod})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-fg-dark-mute tabular-nums">
                    {o.newExpireAt
                      ? o.newExpireAt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
