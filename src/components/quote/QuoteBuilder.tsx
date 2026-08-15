"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { runMatch, saveQuote } from "@/app/actions/quote";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SkuCombobox } from "./SkuCombobox";
import type { CatalogLite, RowState, StyleOption } from "./types";

let keyCounter = 0;
const nextKey = () => `row_${keyCounter++}`;

export function QuoteBuilder({
  styles,
  catalog,
  customers = [],
}: {
  styles: StyleOption[];
  catalog: CatalogLite[];
  customers?: string[];
}) {
  const router = useRouter();
  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  const [styleId, setStyleId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [taxRatePct, setTaxRatePct] = useState(0);
  const [rows, setRows] = useState<RowState[]>([]);
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [learnedNote, setLearnedNote] = useState<string | null>(null);

  async function onMatch() {
    setBusy(true);
    setLearnedNote(null);
    try {
      const matched = await runMatch(rawInput, styleId);
      setRows(
        matched.map((m) => ({
          key: nextKey(),
          rawText: m.rawText,
          parsedShorthand: m.shorthand,
          quantity: m.quantity,
          catalogItemId: m.catalogItemId,
          method: m.method,
          confidence: m.confidence,
          candidateIds: m.candidates.map((c) => c.catalogItemId),
        })),
      );
    } finally {
      setBusy(false);
    }
  }

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onPickSku(key: string, id: string | null) {
    // A manual pick is a strong signal: mark it MANUAL at full confidence.
    updateRow(key, id ? { catalogItemId: id, method: "MANUAL", confidence: 1 } : { catalogItemId: null, method: "UNMATCHED", confidence: 0 });
  }

  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: nextKey(), rawText: "(manual)", parsedShorthand: "", quantity: 1, catalogItemId: null, method: "MANUAL", confidence: 0, candidateIds: [] },
    ]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  // Sort so rows needing attention float to the top.
  const sortedRows = useMemo(() => {
    const rank = (r: RowState) => (!r.catalogItemId ? 0 : r.confidence < 0.9 ? 1 : 2);
    return [...rows].sort((a, b) => rank(a) - rank(b));
  }, [rows]);

  const subtotalCents = rows.reduce((sum, r) => {
    const item = r.catalogItemId ? catalogById.get(r.catalogItemId) : undefined;
    return sum + (item ? item.priceCents * r.quantity : 0);
  }, 0);
  const taxCents = Math.round((subtotalCents * taxRatePct) / 100);
  const totalCents = subtotalCents + taxCents;

  const unmatchedCount = rows.filter((r) => !r.catalogItemId).length;
  const canConfirm = rows.length > 0 && (unmatchedCount === 0 || override);

  async function persist(confirm: boolean) {
    setBusy(true);
    try {
      const result = await saveQuote({
        styleId,
        customerName: customerName || null,
        rawInput,
        taxRatePct,
        confirm,
        lines: rows.map((r, i) => ({
          lineNumber: i + 1,
          rawText: r.rawText,
          parsedShorthand: r.parsedShorthand,
          quantity: r.quantity,
          catalogItemId: r.catalogItemId,
          method: r.method,
          confidence: r.confidence,
        })),
      });
      router.push(`/quotes/${result.quoteId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        {/* Input panel */}
        <div className="space-y-3 rounded-md border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Door style</span>
              <select
                className="rounded-md border border-border px-2 py-1.5"
                value={styleId ?? ""}
                onChange={(e) => setStyleId(e.target.value || null)}
              >
                <option value="">— none (match across all) —</option>
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Customer (optional)</span>
              <input
                className="rounded-md border border-border px-2 py-1.5"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer or company name"
                list="customer-names"
              />
              <datalist id="customer-names">
                {customers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Paste the customer&apos;s request</span>
            <textarea
              className="h-32 rounded-md border border-border px-2 py-1.5 font-mono text-sm"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"e.g.\nB15 x2\nW3030\n3 B18\nA15 (4)"}
            />
          </label>
          <Button onClick={onMatch} disabled={busy || !rawInput.trim()}>
            {busy ? "Matching…" : "Parse & Match"}
          </Button>
        </div>

        {/* Review table */}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-2 py-2">Request</th>
                  <th className="px-2 py-2 w-16">Qty</th>
                  <th className="px-2 py-2">Matched SKU</th>
                  <th className="px-2 py-2 text-right">Unit</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2">Match</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRows.map((r) => {
                  const item = r.catalogItemId ? catalogById.get(r.catalogItemId) : undefined;
                  const lineTotal = item ? item.priceCents * r.quantity : 0;
                  return (
                    <tr key={r.key} className={!r.catalogItemId ? "bg-red-50/40" : ""}>
                      <td className="px-2 py-1.5 font-mono">{r.rawText}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={r.quantity}
                          onChange={(e) => updateRow(r.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-14 rounded-md border border-border px-1 py-0.5"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[16rem]">
                        <SkuCombobox
                          catalog={catalog}
                          catalogById={catalogById}
                          value={r.catalogItemId}
                          candidateIds={r.candidateIds}
                          styleId={styleId}
                          onChange={(id) => onPickSku(r.key, id)}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">{item ? formatCents(item.priceCents) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{item ? formatCents(lineTotal) : "—"}</td>
                      <td className="px-2 py-1.5">
                        <ConfidenceBadge method={r.method} confidence={r.confidence} matched={!!r.catalogItemId} />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button onClick={() => removeRow(r.key)} className="text-xs text-muted-foreground hover:text-red-600">
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-border p-2">
              <Button variant="ghost" onClick={addRow} className="text-xs">
                + Add line
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary panel */}
      <div className="h-fit space-y-3 rounded-md border border-border p-4">
        <h2 className="font-semibold">Summary</h2>
        <dl className="space-y-1 text-sm">
          <Row label="Lines" value={String(rows.length)} />
          <Row label="Subtotal" value={formatCents(subtotalCents)} />
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground">
              Tax %
              <input
                type="number"
                min={0}
                step={0.1}
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(Math.max(0, Number(e.target.value) || 0))}
                className="ml-2 w-16 rounded-md border border-border px-1 py-0.5"
              />
            </label>
            <span>{formatCents(taxCents)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
        </dl>

        {unmatchedCount > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            {unmatchedCount} line{unmatchedCount > 1 ? "s" : ""} still need a SKU.
            <label className="mt-1 flex items-center gap-1.5">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              Confirm anyway
            </label>
          </div>
        )}
        {learnedNote && <p className="text-xs text-green-700">{learnedNote}</p>}

        <div className="flex flex-col gap-2">
          <Button onClick={() => persist(true)} disabled={busy || !canConfirm}>
            {busy ? "Saving…" : "Confirm quote"}
          </Button>
          <Button variant="secondary" onClick={() => persist(false)} disabled={busy || rows.length === 0}>
            Save draft
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Confirming teaches the tool: each corrected code is remembered for next time.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
