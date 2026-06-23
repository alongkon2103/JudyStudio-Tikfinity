import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Tikfinity module reads TIKFINITY_API_BASE / TIKFINITY_RESELLER_KEY
// lazily via env getters, so set them before importing.
process.env.TIKFINITY_API_BASE    = "https://example.test/api/reseller";
process.env.TIKFINITY_RESELLER_KEY = "TEST_KEY_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

import {
  calculateNewExpire,
  findUserByEmail,
  setProExpire,
  getResellerInfo,
} from "../tikfinity";

// ─── calculateNewExpire ─────────────────────────────────────
//
// The function is the heart of the system: getting this wrong means
// customers pay for days they don't receive (or worse, get free
// days that we paid Tikfinity for). Test every branch deliberately.

describe("calculateNewExpire", () => {
  const NOW = new Date("2026-06-22T10:00:00.000Z");

  it("starts from now when there is no prior expiry", () => {
    const result = calculateNewExpire({
      oldExpireAt:  null,
      durationDays: 3,
      now:          NOW,
    });
    // 3 days = 72h after NOW
    expect(result.toISOString()).toBe("2026-06-25T10:00:00.000Z");
  });

  it("starts from now when the prior expiry has already passed", () => {
    const expired = new Date("2026-06-20T08:00:00.000Z"); // before NOW
    const result = calculateNewExpire({
      oldExpireAt:  expired,
      durationDays: 7,
      now:          NOW,
    });
    expect(result.toISOString()).toBe("2026-06-29T10:00:00.000Z");
  });

  it("stacks on top of an active future expiry", () => {
    const future = new Date("2026-07-01T12:00:00.000Z");
    const result = calculateNewExpire({
      oldExpireAt:  future,
      durationDays: 30,
      now:          NOW,
    });
    // 30 days after future = July 31 12:00 UTC
    expect(result.toISOString()).toBe("2026-07-31T12:00:00.000Z");
  });

  it("treats prior expiry exactly at `now` as expired (uses now as base)", () => {
    // oldExpireAt.getTime() > now.getTime() must be strictly greater —
    // an oldExpireAt equal to now means the pro has run out at this
    // very instant and the next purchase starts a fresh window.
    const result = calculateNewExpire({
      oldExpireAt:  new Date(NOW),
      durationDays: 3,
      now:          NOW,
    });
    expect(result.toISOString()).toBe("2026-06-25T10:00:00.000Z");
  });

  it("handles 90-day stacking without overflow", () => {
    const future = new Date("2026-12-01T00:00:00.000Z");
    const result = calculateNewExpire({
      oldExpireAt:  future,
      durationDays: 90,
      now:          NOW,
    });
    // 90 days from Dec 1 = Mar 1 next year
    expect(result.toISOString()).toBe("2027-03-01T00:00:00.000Z");
  });
});

// ─── Tikfinity API wrappers (mocked fetch) ─────────────────

describe("findUserByEmail", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          channelId:   3185109,
          proActive:   "No",
          proExpireAt: "06/10/2026, 09:48:04 PM",
          username:    "imacooconut",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const r = await findUserByEmail("alongkon2103@gmail.com");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.channelId).toBe(3185109);
      expect(r.data.username).toBe("imacooconut");
      expect(r.data.proActive).toBe(false);
      expect(r.data.proExpireAt).toBeInstanceOf(Date);
    }
  });

  it("returns EMAIL_NOT_FOUND when the API replies 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    const r = await findUserByEmail("nobody@example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("EMAIL_NOT_FOUND");
  });

  it("returns NETWORK_ERROR when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const r = await findUserByEmail("any@example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NETWORK_ERROR");
  });

  it("encodes the email in the query string (no injection of raw special chars)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ channelId: 1, proActive: "No", proExpireAt: null, username: "u" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await findUserByEmail("user+tag@example.com");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("email=user%2Btag%40example.com");
  });

  it("flags malformed JSON as INVALID_RESPONSE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>oops</html>", { status: 200 }),
    );

    const r = await findUserByEmail("any@example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_RESPONSE");
  });
});

describe("setProExpire", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends an ISO string + reseller key in the body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const newExpire = new Date("2026-07-01T12:00:00.000Z");
    const r = await setProExpire({
      channelId:   12345,
      email:       "x@example.com",
      newExpireAt: newExpire,
    });

    expect(r.ok).toBe(true);
    const callArgs = fetchMock.mock.calls[0]!;
    const init = callArgs[1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      channelId:   12345,
      email:       "x@example.com",
      proExpireAt: "2026-07-01T12:00:00.000Z",
    });
    // The reseller key must be included — without it Tikfinity would
    // 401 and burn an order's worth of customer frustration.
    expect(body.resellerKey).toBe(process.env.TIKFINITY_RESELLER_KEY);
  });

  it("classifies insufficient-credit responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "insufficient credits" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    const r = await setProExpire({
      channelId:   1,
      email:       "x@example.com",
      newExpireAt: new Date(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INSUFFICIENT_CREDITS");
  });
});

describe("getResellerInfo", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renames default_rates → defaultRates and parses ISO dates in history", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          activationCounter: 4,
          credits:           29520,
          default_rates:     { 3: 45, 7: 100, 30: 389, 90: 1150 },
          rates:             { 3: 40, 7: 90,  30: 360, 90: 1000 },
          totalPoints:       480,
          status:            200,
          history: [
            {
              cost:           360,
              createdAt:      "2026-06-19T15:16:39.798Z",
              days:           30,
              email:          "sunpink@example.com",
              newProExpireAt: "2026-07-23T09:35:30.000Z",
              oldProExpireAt: "2026-06-23T09:35:30.000Z",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const r = await getResellerInfo();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.credits).toBe(29520);
      expect(r.data.defaultRates["30"]).toBe(389);
      expect(r.data.rates["30"]).toBe(360);
      expect(r.data.history[0]!.createdAt).toBeInstanceOf(Date);
      expect(r.data.history[0]!.newProExpireAt?.toISOString())
        .toBe("2026-07-23T09:35:30.000Z");
    }
  });

  it("tolerates a missing history array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          activationCounter: 0,
          credits:           0,
          default_rates:     {},
          rates:             {},
          totalPoints:       0,
          // history field absent — older API revisions might omit it
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const r = await getResellerInfo();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.history).toEqual([]);
  });
});
