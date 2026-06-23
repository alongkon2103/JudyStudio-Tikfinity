/**
 * Tikfinity reseller API wrapper.
 *
 * Documented endpoints (tikfinityth.one):
 *   GET  /findUserByEmail?email=...
 *   GET  /history?key=...
 *   POST /setProExpire  { channelId, proExpireAt, email, resellerKey }
 *
 * All three are called server-side ONLY — the reseller key authorizes
 * mutating actions (debits credits, extends user pro) and must never
 * reach the browser bundle. We surface a typed Result so callers can
 * branch on `ok` instead of catching exceptions for control flow.
 */
import { env } from "./env";

// ─── Types ──────────────────────────────────────────────────

export type TikfinityUser = {
  channelId: number;
  username: string;
  /** True when Tikfinity's `proActive: "Yes"`. */
  proActive: boolean;
  /** Parsed expiry. null when the user has never been pro. */
  proExpireAt: Date | null;
};

export type TikfinityHistoryItem = {
  cost: number;
  createdAt: Date;
  days: number;
  email: string;
  newProExpireAt: Date | null;
  oldProExpireAt: Date | null;
};

export type TikfinityResellerInfo = {
  activationCounter: number;
  /** Reseller wallet balance, in whole baht (NOT satang). */
  credits: number;
  /** Map of "<days>" → price in baht — what end users pay direct. */
  defaultRates: Record<string, number>;
  /** Map of "<days>" → price in baht — what WE pay as reseller. */
  rates: Record<string, number>;
  history: TikfinityHistoryItem[];
  totalPoints: number;
};

/** Typed Result so callers can branch on `ok` without try/catch. */
export type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; code: TikfinityErrorCode; message: string };

export type TikfinityErrorCode =
  | "EMAIL_NOT_FOUND"
  | "INSUFFICIENT_CREDITS"
  | "INVALID_KEY"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

// ─── Date parsing ───────────────────────────────────────────

/**
 * findUserByEmail returns a US-locale formatted string like
 *   "06/10/2026, 09:48:04 PM"
 * (with the AM/PM and comma). Date() can parse this in V8/Node but
 * we wrap it so a future format change surfaces as null instead of
 * propagating an Invalid Date silently into downstream math.
 *
 * history/ setProExpire use ISO strings, which Date() parses cleanly
 * — no special handling.
 */
function parseTikfinityDate(input: string | null | undefined): Date | null {
  if (!input || typeof input !== "string") return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── HTTP helper ────────────────────────────────────────────

async function tikfinityFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> {
  const url = `${env.TIKFINITY_API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      // Tikfinity has no public SLA — 10s ceiling is generous but
      // bounded so a stuck connection doesn't hang the request.
      signal: init?.signal ?? AbortSignal.timeout(10_000),
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: scrubSecrets(err instanceof Error ? err.message : "fetch failed"),
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: `Non-JSON response (HTTP ${res.status})`,
    };
  }

  if (!res.ok) {
    const msg = extractErrorMessage(body) ?? `HTTP ${res.status}`;
    return { ok: false, code: classifyError(res.status, msg), message: scrubSecrets(msg) };
  }

  return { ok: true, data: body as T };
}

/**
 * Strip the reseller key from any string that's about to be
 * propagated outside this module (errors, log lines, DB rows). The
 * key only appears in /history URLs and in setProExpire bodies; we
 * scrub both as a belt-and-suspenders defence in case Tikfinity (or
 * Node's fetch error surface) ever echoes the request back.
 */
function scrubSecrets(s: string): string {
  return s.replaceAll(env.TIKFINITY_RESELLER_KEY, "[REDACTED_KEY]");
}

function extractErrorMessage(body: unknown): string | null {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string") return b.error;
    if (typeof b.message === "string") return b.message;
  }
  return null;
}

function classifyError(httpStatus: number, msg: string): TikfinityErrorCode {
  const low = msg.toLowerCase();
  if (httpStatus === 404 || low.includes("not found")) return "EMAIL_NOT_FOUND";
  if (httpStatus === 401 || httpStatus === 403)        return "INVALID_KEY";
  if (low.includes("credit") || low.includes("insufficient")) return "INSUFFICIENT_CREDITS";
  return "UNKNOWN";
}

// ─── Public API ─────────────────────────────────────────────

export async function findUserByEmail(
  email: string,
): Promise<Result<TikfinityUser>> {
  const path = `/findUserByEmail?email=${encodeURIComponent(email)}`;
  const res = await tikfinityFetch<{
    channelId: number;
    proActive: "Yes" | "No";
    proExpireAt: string | null;
    username: string;
  }>(path);

  if (!res.ok) return res;
  const { channelId, proActive, proExpireAt, username } = res.data;

  if (typeof channelId !== "number" || typeof username !== "string") {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "Tikfinity returned an unexpected shape from findUserByEmail",
    };
  }

  return {
    ok: true,
    data: {
      channelId,
      username,
      proActive: proActive === "Yes",
      proExpireAt: parseTikfinityDate(proExpireAt),
    },
  };
}

export async function getResellerInfo(): Promise<Result<TikfinityResellerInfo>> {
  const path = `/history?key=${encodeURIComponent(env.TIKFINITY_RESELLER_KEY)}`;
  const res = await tikfinityFetch<{
    activationCounter: number;
    credits: number;
    default_rates: Record<string, number>;
    rates: Record<string, number>;
    history: Array<{
      cost: number;
      createdAt: string;
      days: number;
      email: string;
      newProExpireAt: string | null;
      oldProExpireAt: string | null;
    }>;
    totalPoints: number;
    status?: number;
  }>(path);

  if (!res.ok) return res;
  const d = res.data;

  return {
    ok: true,
    data: {
      activationCounter: d.activationCounter,
      credits:           d.credits,
      defaultRates:      d.default_rates,
      rates:             d.rates,
      totalPoints:       d.totalPoints,
      history: (d.history ?? []).map((h) => ({
        cost:            h.cost,
        days:            h.days,
        email:           h.email,
        createdAt:       parseTikfinityDate(h.createdAt) ?? new Date(0),
        newProExpireAt:  parseTikfinityDate(h.newProExpireAt),
        oldProExpireAt:  parseTikfinityDate(h.oldProExpireAt),
      })),
    },
  };
}

export async function setProExpire(args: {
  channelId: number;
  email: string;
  newExpireAt: Date;
}): Promise<Result<{ newExpireAt: Date }>> {
  const res = await tikfinityFetch<unknown>("/setProExpire", {
    method: "POST",
    body: JSON.stringify({
      channelId:    args.channelId,
      email:        args.email,
      proExpireAt:  args.newExpireAt.toISOString(),
      resellerKey:  env.TIKFINITY_RESELLER_KEY,
    }),
  });

  if (!res.ok) return res;
  return { ok: true, data: { newExpireAt: args.newExpireAt } };
}

// ─── Expiry math ────────────────────────────────────────────

/**
 * Determines what to send as `proExpireAt` in setProExpire.
 *
 * Rules learned from inspecting /history:
 *   - If user has no current pro (or it expired in the past), the
 *     extension starts from now: `new = now + days`.
 *   - If user has an active pro that hasn't expired yet, the days
 *     stack on top: `new = oldExpireAt + days`.
 *
 * The function is pure so it's easy to unit-test the boundary
 * conditions (exactly-now, far-future, exactly-past).
 */
export function calculateNewExpire(args: {
  oldExpireAt: Date | null;
  durationDays: number;
  now?: Date;
}): Date {
  const now = args.now ?? new Date();
  const base =
    args.oldExpireAt && args.oldExpireAt.getTime() > now.getTime()
      ? args.oldExpireAt
      : now;
  const ms = args.durationDays * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}
