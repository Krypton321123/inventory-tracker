import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "stockflow_session";
const PUBLIC_PATHS = ["/login"];

// Edge middleware can't import the Mongoose-touching lib/auth.ts (no DB access at the
// edge), so token verification is duplicated here in a minimal, dependency-light form.
// This checks signature + expiry only — it does NOT confirm the user is still active,
// since that requires a DB lookup. The API routes (via getCurrentUser) are the source
// of truth for "is this user currently allowed to do X"; this middleware is just a
// fast redirect for the common case of "no valid token at all," so logged-out users
// don't briefly see a page before being bounced to /login.
async function hasValidToken(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  const valid = await hasValidToken(req);
  if (!valid) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Runs on pages and API routes, but skips static assets and Next's internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};