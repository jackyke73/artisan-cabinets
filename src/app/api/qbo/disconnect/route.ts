import { NextResponse } from "next/server";
import { disconnect } from "@/lib/qbo/oauth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await disconnect();
  return NextResponse.redirect(new URL("/settings/quickbooks?disconnected=1", req.url));
}
