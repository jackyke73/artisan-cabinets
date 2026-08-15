import { NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await expectedToken();
  // Auth disabled — nothing to log into.
  if (!token) return NextResponse.redirect(new URL("/", req.url));

  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/") || "/";

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url));
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
