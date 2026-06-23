import { db } from "@/lib/db";
import { OrderForm } from "@/components/OrderForm";
import { Header } from "@/components/Header";
import { getDict, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = getLocale();
  const t = getDict(locale);
  const [variants, paymentMethods] = await Promise.all([
    db.variant.findMany({
      where:   { isActive: true },
      orderBy: { displayOrder: "asc" },
      select:  {
        id:             true,
        durationDays:   true,
        label:          true,
        labelEn:        true,
        priceTHBSatang: true,
        priceUSDCents:  true,
      },
    }),
    db.paymentMethod.findMany({
      where:   { isActive: true },
      orderBy: { displayOrder: "asc" },
      select:  { id: true, label: true, labelEn: true, feeBps: true },
    }),
  ]);

  return (
    <>
      <Header showAdminLink />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-14">
        <section className="anim-fade-up mb-8 text-center sm:mb-10">
          <h1 className="font-display text-[36px] font-extrabold leading-tight tracking-tight text-fg-dark sm:text-[44px]">
            {t.home.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-fg-dark-soft sm:text-[15px]">
            {t.home.subtitle}
          </p>
        </section>

        <section className="anim-fade-up anim-delay-100">
          <OrderForm
            variants={variants}
            paymentMethods={paymentMethods}
            dict={t}
            locale={locale}
          />
        </section>

        <section className="anim-fade-up anim-delay-200 mt-10 grid gap-3 sm:grid-cols-3">
          <Perk title={t.home.perk.instant.title}  body={t.home.perk.instant.body}  icon="bolt" />
          <Perk title={t.home.perk.safe.title}     body={t.home.perk.safe.body}     icon="shield" />
          <Perk title={t.home.perk.reseller.title} body={t.home.perk.reseller.body} icon="link" />
        </section>

        <footer className="mt-12 text-center text-[11px] text-fg-dark-mute">
          {t.footer.tagline}
        </footer>
      </main>
    </>
  );
}

function Perk({
  title,
  body,
  icon,
}: {
  title: string;
  body:  string;
  icon:  "bolt" | "shield" | "link";
}) {
  return (
    <div className="sticker rounded-md p-4">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-pill bg-pink-500/20 text-pink-300">
        <Icon name={icon} />
      </div>
      <h3 className="text-[13px] font-semibold text-fg-light">{title}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-fg-light-soft">{body}</p>
    </div>
  );
}

function Icon({ name }: { name: "bolt" | "shield" | "link" }) {
  const common = {
    width:  16,
    height: 16,
    viewBox: "0 0 24 24",
    fill:   "none",
    stroke: "currentColor",
    strokeWidth:    "2",
    strokeLinecap:  "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "bolt") {
    return <svg {...common}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>;
  }
  if (name === "shield") {
    return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  }
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
