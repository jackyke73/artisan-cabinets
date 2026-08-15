import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeAndSave } from "@/lib/qbo/oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const savedState = req.cookies.get("qbo_state")?.value;

  const settings = (q: string) => NextResponse.redirect(new URL(`/settings/quickbooks?${q}`, req.url));

  if (!code || !realmId) return settings("error=denied");
  if (!savedState || savedState !== state) return settings("error=state");

  try {
    await exchangeCodeAndSave(code, realmId);
  } catch (err) {
    console.error("[qbo] token exchange failed:", err);
    return settings("error=exchange");
  }

  const res = settings("connected=1");
  res.cookies.delete("qbo_state");
  return res;
}
