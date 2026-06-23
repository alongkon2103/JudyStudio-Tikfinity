import { db } from "@/lib/db";
import { PaymentMethodsTable } from "./PaymentMethodsTable";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const methods = await db.paymentMethod.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[20px] font-extrabold tracking-tight text-fg-dark">Payment methods</h1>
        <p className="mt-1 text-[12px] text-fg-dark-mute">
          เปิด/ปิด ช่องทางชำระเงิน และตั้งค่าธรรมเนียม % ที่บวกเพิ่มจากราคาขาย —
          ฝั่งลูกค้าจะเห็นยอดรวมรวมค่าธรรมเนียมก่อนกดจ่าย
        </p>
      </header>

      <PaymentMethodsTable
        methods={methods.map((m) => ({
          id:           m.id,
          label:        m.label,
          labelEn:      m.labelEn,
          feeBps:       m.feeBps,
          isActive:     m.isActive,
          displayOrder: m.displayOrder,
        }))}
      />
    </div>
  );
}
