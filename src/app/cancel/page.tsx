import { Header } from "@/components/Header";
import { getDict } from "@/lib/i18n";

export default function CancelPage() {
  const t = getDict();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-10 pb-16 sm:pt-14">
        <div className="sticker rounded-lg p-8 text-center anim-fade-up">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-paper-3 text-fg-light-mute">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-[24px] font-extrabold text-fg-light">{t.cancel.title}</h1>
          <p className="mt-2 text-[13px] text-fg-light-soft">{t.cancel.body}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-pill bg-pink-500 px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_3px_0_var(--pink-600)] transition-transform duration-fast ease-spring hover:-translate-y-0.5 active:translate-y-0.5"
          >
            {t.cancel.backHome}
          </a>
        </div>
      </main>
    </>
  );
}
