"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pushQuote } from "@/app/actions/qbo";

export function PushToQuickBooksButton({
  quoteId,
  connected,
  qboEstimateId,
}: {
  quoteId: string;
  connected: boolean;
  qboEstimateId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!connected) {
    return (
      <a
        href="/settings/quickbooks"
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        title="Connect QuickBooks to enable pushing quotes"
      >
        Connect QuickBooks
      </a>
    );
  }

  if (qboEstimateId) {
    return (
      <span className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-800">
        In QuickBooks · Estimate #{qboEstimateId}
      </span>
    );
  }

  async function onPush() {
    setBusy(true);
    setError(null);
    const result = await pushQuote(quoteId);
    setBusy(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        onClick={onPush}
        disabled={busy}
        className="rounded-md bg-[#2CA01C] px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
      >
        {busy ? "Pushing…" : "Push to QuickBooks"}
      </button>
      {error && <span className="absolute top-full mt-1 w-72 text-right text-xs text-red-600">{error}</span>}
    </span>
  );
}
