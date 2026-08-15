"use client";

import { useMemo, useState } from "react";
import { formatCents } from "@/lib/money";
import type { CatalogLite } from "./types";

export function SkuCombobox({
  catalog,
  catalogById,
  value,
  candidateIds,
  styleId,
  onChange,
}: {
  catalog: CatalogLite[];
  catalogById: Map<string, CatalogLite>;
  value: string | null;
  candidateIds: string[];
  styleId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? catalogById.get(value) : undefined;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Suggestions first (the match candidates), then a filtered catalog search.
    const suggestionItems = candidateIds
      .map((id) => catalogById.get(id))
      .filter((i): i is CatalogLite => !!i);

    if (!q) {
      const scoped = styleId ? catalog.filter((c) => c.styleId === styleId) : catalog;
      const base = suggestionItems.length ? suggestionItems : scoped.slice(0, 20);
      return dedupe(base).slice(0, 20);
    }
    const filtered = catalog.filter(
      (c) => c.sku.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
    return dedupe([...suggestionItems.filter((s) => s.sku.toLowerCase().includes(q)), ...filtered]).slice(0, 20);
  }, [query, candidateIds, catalog, catalogById, styleId]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-md border px-2 py-1 text-left text-sm ${
          selected ? "border-border" : "border-red-300 bg-red-50 text-red-700"
        }`}
      >
        {selected ? (
          <span>
            <span className="font-mono">{selected.sku}</span>{" "}
            <span className="text-muted-foreground">— {selected.description}</span>
          </span>
        ) : (
          "Choose a SKU…"
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-96 rounded-md border border-border bg-white shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU or description…"
              className="w-full border-b border-border px-2 py-1.5 text-sm outline-none"
            />
            <ul className="max-h-64 overflow-auto text-sm">
              {results.length === 0 && <li className="px-2 py-2 text-muted-foreground">No matches.</li>}
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted ${
                      item.id === value ? "bg-muted" : ""
                    }`}
                  >
                    <span>
                      <span className="font-mono">{item.sku}</span>{" "}
                      <span className="text-muted-foreground">— {item.description}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{formatCents(item.priceCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full border-t border-border px-2 py-1.5 text-left text-xs text-red-600 hover:bg-muted"
              >
                Clear selection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function dedupe(items: CatalogLite[]): CatalogLite[] {
  const seen = new Set<string>();
  const out: CatalogLite[] = [];
  for (const i of items) {
    if (!seen.has(i.id)) {
      seen.add(i.id);
      out.push(i);
    }
  }
  return out;
}
