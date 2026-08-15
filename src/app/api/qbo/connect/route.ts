import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { qboConfigured } from "@/lib/qbo/config";
import { buildAuthorizeUrl } from "@/lib/qbo/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!qboConfigured()) {
    return NextResponse.redirect(new URL("/settings/quickbooks?error=notconfigured", req.url));
  }
  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  // CSRF nonce, verified on callback. 1h window so a multi-step sign-in (incl.
  // 2FA and human delays) doesn't expire the check mid-flow.
  res.cookies.set("qbo_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  return res;
}
