import { db } from "@/lib/db";
import { getResellerInfo } from "@/lib/tikfinity";
import { PricingTable } from "./PricingTable";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [variants, resellerInfo] = await Promise.all([
    db.variant.findMany({ orderBy: { displayOrder: "asc" } }),
    getResellerInfo(),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[20px] font-extrabold tracking-tight text-fg-dark">Pricing</h1>
        <p className="mt-1 text-[12px] text-fg-dark-mute">
          ตั้งราคาขายแต่ละ duration — cost snapshot ดึงจาก seed; Live cost ดึงสดจาก Tikfinity reseller API
        </p>
      </header>

      <PricingTable
        variants={variants.map((v) => ({
          id:             v.id,
          durationDays:   v.durationDays,
          label:          v.label,
          labelEn:        v.labelEn,
          priceTHBSatang: v.priceTHBSatang,
          priceUSDCents:  v.priceUSDCents,
          costTHBSatang:  v.costTHBSatang,
          isActive:       v.isActive,
        }))}
        liveRates={resellerInfo.ok ? resellerInfo.data.rates : null}
      />
    </div>
  );
}
