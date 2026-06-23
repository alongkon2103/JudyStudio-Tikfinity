/**
 * Validate a `?next=` style redirect target so we never bounce to an
 * external domain.
 */
export function safeNextPath(
  candidate: string | null | undefined,
  fallback = "/admin",
): string {
  if (!candidate || typeof candidate !== "string") return fallback;
  const trimmed = candidate.trim();

  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.length > 512) return fallback;

  return trimmed;
}
