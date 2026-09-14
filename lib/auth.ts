import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import User, { IUser, IUserPermissions } from "@/models/User";

const COOKIE_NAME = "stockflow_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail loudly at request time rather than silently signing tokens with an empty
    // key — an empty-key JWT is forgeable.
    throw new Error(
      "JWT_SECRET is not set. Add a long random string to your .env file, e.g.\n" +
        "JWT_SECRET=$(openssl rand -base64 48)"
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: "superuser" | "staff";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.userId, role: payload.role as SessionPayload["role"] };
  } catch {
    // Expired, malformed, or wrong-signature token — treat identically to "no session"
    // rather than leaking which failure mode occurred.
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Loads the full current user (with permissions) from the DB, given the request's cookies.
 * Returns null if there's no valid session or the user was deactivated/deleted after
 * the token was issued — this second check matters because a JWT alone can't reflect
 * an admin revoking access mid-session.
 */
export async function getCurrentUser(): Promise<IUser | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.userId);
  if (!user || !user.active) return null;
  return user;
}

/**
 * Returns true if the user has the given permission. Superusers always pass —
 * this is the single place that rule lives, so route handlers never re-derive it.
 */
export function hasPermission(user: IUser, permission: keyof IUserPermissions): boolean {
  if (user.role === "superuser") return true;
  return Boolean(user.permissions?.[permission]);
}

export { COOKIE_NAME };