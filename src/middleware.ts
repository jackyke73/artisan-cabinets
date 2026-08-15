import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = await expectedToken();
  if (!token) return NextResponse.next(); // auth disabled (no APP_PASSWORD)

  const { pathname } = req.nextUrl;
  // Public: login endpoints, and the legal pages (Intuit must be able to fetch
  // the EULA/privacy URLs without a login).
  if (pathname === "/login" || pathname === "/api/login" || pathname.startsWith("/legal")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
