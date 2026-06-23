/**
 * In-memory sliding-window rate limiter.
 *
 * Single-instance only — replace with Redis before scaling out.
 * Eviction runs lazily inside hit() so we don't keep a timer alive.
 */

type Window = { hits: number[]; limit: number; windowMs: number };

const STORE = new Map<string, Window>();

const EVICT_INTERVAL_MS = 5 * 60 * 1000;
let lastEvict = 0;
function maybeEvict(now: number): void {
  if (now - lastEvict < EVICT_INTERVAL_MS) return;
  lastEvict = now;
  for (const [key, win] of STORE.entries()) {
    const cutoff = now - win.windowMs;
    while (win.hits.length && win.hits[0]! <= cutoff) win.hits.shift();
    if (win.hits.length === 0) STORE.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetIn: number;
};

export function hit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  maybeEvict(now);

  let win = STORE.get(key);
  if (!win) {
    win = { hits: [], limit: opts.limit, windowMs: opts.windowMs };
    STORE.set(key, win);
  }

  while (win.hits.length && win.hits[0]! <= cutoff) win.hits.shift();

  if (win.hits.length >= opts.limit) {
    const oldest = win.hits[0]!;
    return {
      ok: false,
      remaining: 0,
      resetIn: Math.max(0, oldest + opts.windowMs - now),
    };
  }

  win.hits.push(now);
  return {
    ok: true,
    remaining: opts.limit - win.hits.length,
    resetIn: opts.windowMs,
  };
}

export function reset(key: string): void {
  STORE.delete(key);
}

/**
 * Best-effort caller IP. Honors proxy headers when TRUST_PROXY=1.
 * Otherwise collapses to a single bucket so it fails-closed.
 */
export function clientIp(reqOrHeaders: Request | Headers): string {
  const headers = reqOrHeaders instanceof Headers ? reqOrHeaders : reqOrHeaders.headers;
  const trustProxy = process.env.TRUST_PROXY === "1";

  if (trustProxy) {
    const cf = headers.get("cf-connecting-ip");
    if (cf) return cf.trim();
    const real = headers.get("x-real-ip");
    if (real) return real.trim();
    const fwd = headers.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return process.env.NODE_ENV === "production" ? "_unknown_" : "_dev_";
}

export function retryAfterSeconds(resetIn: number): number {
  return Math.max(1, Math.ceil(resetIn / 1000));
}
