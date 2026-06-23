import { SuccessView } from "./SuccessView";
import { Header } from "@/components/Header";
import { getDict, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const locale = getLocale();
  const t = getDict(locale);
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-[24px] font-extrabold text-fg-dark">{t.success.noOrder}</h1>
          <p className="mt-2 text-[13px] text-fg-dark-soft">{t.success.waitNote}</p>
          <a href="/" className="mt-6 inline-block text-pink-400 underline">{t.success.backHome}</a>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-10 pb-16 sm:pt-14">
        <SuccessView sessionId={sessionId} dict={t} locale={locale} />
      </main>
    </>
  );
}
