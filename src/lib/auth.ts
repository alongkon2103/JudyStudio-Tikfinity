/**
 * Admin auth — JWT-in-cookie session.
 *
 * Pure JS: `jose` and `bcryptjs` both work in the Edge runtime, so
 * the verifier can be called from `middleware.ts`. Prisma calls
 * stay in Node-runtime route handlers / server actions.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { env } from "./env";

const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-judytik_admin_session"
    : "judytik_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const JWT_ISSUER = "judytik-admin";
const JWT_AUDIENCE = "judytik-admin";

export type AdminSession = {
  sub: string;
  email: string;
  tv: number;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.ADMIN_SESSION_SECRET);
}

export async function signSession(payload: AdminSession): Promise<string> {
  return new SignJWT({ email: payload.email, tv: payload.tv } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.tv !== "number"
    ) {
      return null;
    }
    return { sub: payload.sub, email: payload.email, tv: payload.tv };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
} as const;

export type CookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

export function buildSessionCookie(token: string): CookieOptions {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function buildClearCookie(): CookieOptions {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
