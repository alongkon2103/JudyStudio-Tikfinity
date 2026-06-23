/**
 * Order status pill — tuned for the kawaii dark canvas.
 * PAID and FULFILLED use accent colors from the brand palette
 * so successful orders pop visually; FAILED uses the bad token.
 */
const STATUS_STYLES: Record<string, string> = {
  PAID:      "bg-cyan-500/15  text-cyan-300  border-cyan-500/40",
  FULFILLED: "bg-ok/15        text-ok        border-ok/40",
  FAILED:    "bg-bad/15       text-bad       border-bad/40",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] " +
        (STATUS_STYLES[status] ?? "bg-paper-3 text-fg-dark-mute border-line-dark")
      }
    >
      {status}
    </span>
  );
}
