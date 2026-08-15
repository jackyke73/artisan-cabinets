"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AppField = "sku" | "description" | "price" | "category" | "sizeCode" | "style";
const REQUIRED: AppField[] = ["sku", "description", "price"];
const OPTIONAL: AppField[] = ["category", "sizeCode", "style"];
const LABELS: Record<AppField, string> = {
  sku: "SKU / code",
  description: "Description",
  price: "Price",
  category: "Category",
  sizeCode: "Size code",
  style: "Style",
};

interface Parsed {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  guess: Partial<Record<AppField, string>>;
}

interface Summary {
  imported: number;
  skipped: number;
  errors: { rowNumber: number; sku: string; reason: string }[];
  stylesCreated: string[];
}

function priceOk(v: string): boolean {
  const cleaned = v.replace(/[$,\s]/g, "").trim();
  return cleaned !== "" && Number.isFinite(Number(cleaned));
}

export default function ImportPage() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<AppField, string>>>({});
  const [derive, setDerive] = useState(false);
  const [separator, setSeparator] = useState("-");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input = (e.currentTarget.elements.namedItem("file") as HTMLInputElement) ?? null;
    const file = input?.files?.[0];
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/catalog/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed.");
      setParsed(data);
      setMapping(data.guess ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed.");
    } finally {
      setBusy(false);
    }
  }

  const validity = useMemo(() => {
    if (!parsed || !mapping.sku || !mapping.description || !mapping.price) return null;
    let good = 0;
    let bad = 0;
    for (const row of parsed.rows) {
      const sku = row[mapping.sku]?.trim();
      const desc = row[mapping.description]?.trim();
      const price = row[mapping.price] ?? "";
      if (sku && desc && priceOk(price)) good++;
      else bad++;
    }
    return { good, bad };
  }, [parsed, mapping]);

  async function onCommit() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: parsed.filename,
          mapping,
          rows: parsed.rows,
          deriveStyleFromSku: derive,
          separator,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  if (summary) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Import complete</h1>
        <div className="flex gap-3">
          <Badge variant="green">{summary.imported} imported</Badge>
          {summary.skipped > 0 && <Badge variant="red">{summary.skipped} skipped</Badge>}
          {summary.stylesCreated.length > 0 && (
            <Badge variant="gray">styles: {summary.stylesCreated.join(", ")}</Badge>
          )}
        </div>
        {summary.errors.length > 0 && (
          <div className="rounded-md border border-border">
            <div className="border-b border-border bg-muted px-3 py-2 text-sm font-medium">Skipped rows</div>
            <ul className="max-h-64 divide-y divide-border overflow-auto text-sm">
              {summary.errors.map((e, i) => (
                <li key={i} className="px-3 py-1.5">
                  <span className="text-muted-foreground">row {e.rowNumber}</span>{" "}
                  <span className="font-mono">{e.sku || "—"}</span>: {e.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <Link href="/catalog" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            View catalog
          </Link>
          <Link href="/quotes/new" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Build a quote
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Import catalog</h1>
      <p className="text-sm text-muted-foreground">
        Upload your master price list (.xlsx or .csv). We&apos;ll map the columns and validate every row before anything
        is saved. Existing items are updated by SKU; nothing is deleted unless you choose &quot;replace&quot;.
      </p>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {!parsed ? (
        <form onSubmit={onUpload} className="flex items-center gap-3">
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Reading…" : "Upload"}
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{parsed.filename}</span> — {parsed.rowCount} rows,{" "}
            {parsed.headers.length} columns.
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[...REQUIRED, ...OPTIONAL].map((field) => (
              <label key={field} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {LABELS[field]} {REQUIRED.includes(field) && <span className="text-red-600">*</span>}
                </span>
                <select
                  className="rounded-md border border-border px-2 py-1.5"
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                >
                  <option value="">— none —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="rounded-md border border-border p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={derive} onChange={(e) => setDerive(e.target.checked)} />
              Derive style &amp; size from the SKU (e.g. <span className="font-mono">BPS-A15</span> → style{" "}
              <span className="font-mono">BPS</span> + size <span className="font-mono">A15</span>)
            </label>
            {derive && (
              <label className="flex items-center gap-2 text-sm">
                Separator
                <input
                  className="w-16 rounded-md border border-border px-2 py-1 font-mono"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                />
              </label>
            )}
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">On commit:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge / update (safe)
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Full replace
              </label>
            </div>
          </div>

          {validity ? (
            <div className="flex items-center gap-3">
              <Badge variant="green">{validity.good} valid rows</Badge>
              {validity.bad > 0 && <Badge variant="red">{validity.bad} will be skipped</Badge>}
            </div>
          ) : (
            <p className="text-sm text-amber-700">Map SKU, description, and price to continue.</p>
          )}

          <PreviewTable parsed={parsed} mapping={mapping} />

          <div className="flex gap-3">
            <Button onClick={onCommit} disabled={busy || !validity || validity.good === 0}>
              {busy ? "Importing…" : `Import ${validity?.good ?? 0} items`}
            </Button>
            <Button variant="secondary" onClick={() => setParsed(null)} disabled={busy}>
              Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTable({ parsed, mapping }: { parsed: Parsed; mapping: Partial<Record<AppField, string>> }) {
  if (!mapping.sku || !mapping.description || !mapping.price) return null;
  const rows = parsed.rows.slice(0, 5);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const sku = row[mapping.sku!]?.trim();
            const desc = row[mapping.description!]?.trim();
            const price = row[mapping.price!] ?? "";
            const ok = sku && desc && priceOk(price);
            return (
              <tr key={i} className={ok ? "" : "bg-red-50"}>
                <td className="px-3 py-1.5 font-mono">{sku || "—"}</td>
                <td className="px-3 py-1.5">{desc || "—"}</td>
                <td className="px-3 py-1.5">{price || "—"}</td>
                <td className="px-3 py-1.5">{ok ? <Badge variant="green">ok</Badge> : <Badge variant="red">skip</Badge>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
