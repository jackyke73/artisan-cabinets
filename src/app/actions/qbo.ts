"use server";

import { revalidatePath } from "next/cache";
import { pushQuoteToQuickBooks } from "@/lib/qbo/push";

export async function pushQuote(
  quoteId: string,
): Promise<{ ok: true; estimateId: string } | { ok: false; error: string }> {
  try {
    const result = await pushQuoteToQuickBooks(quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/");
    return { ok: true, estimateId: result.estimateId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Push to QuickBooks failed." };
  }
}
