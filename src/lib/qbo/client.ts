import { QBO_API_BASE } from "./config";
import { ensureAccessToken, getConnection } from "./oauth";

const MINOR_VERSION = "65";

/** True when a QBO company is connected (a stored token exists). */
export async function qboConnected(): Promise<boolean> {
  return (await getConnection()) !== null;
}

/** Escape a value for the QuickBooks query language (single quotes, backslashes). */
export function escapeQbo(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function qboRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken, realmId } = await ensureAccessToken();
  const base = `${QBO_API_BASE}/v3/company/${realmId}/${path}`;
  const url = base + (base.includes("?") ? "&" : "?") + `minorversion=${MINOR_VERSION}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const fault = (json as { Fault?: unknown }).Fault ?? json;
    throw new Error(`QuickBooks API ${res.status}: ${JSON.stringify(fault).slice(0, 400)}`);
  }
  return json as T;
}

interface QueryResponse<T> {
  QueryResponse?: Record<string, T[] | undefined>;
}

async function qboQuery<T>(entity: string, query: string): Promise<T[]> {
  const json = await qboRequest<QueryResponse<T>>(`query?query=${encodeURIComponent(query)}`);
  return (json.QueryResponse?.[entity] as T[] | undefined) ?? [];
}

interface QboRef {
  Id: string;
}

/** The income account new items post to (required by QBO for Service items). */
export async function getIncomeAccountId(): Promise<string> {
  const accounts = await qboQuery<QboRef>("Account", "select * from Account where AccountType = 'Income'");
  if (accounts.length === 0) throw new Error("No income account found in QuickBooks to attach new items to.");
  return accounts[0].Id;
}

export async function findOrCreateCustomer(name: string): Promise<string> {
  const existing = await qboQuery<QboRef>("Customer", `select * from Customer where DisplayName = '${escapeQbo(name)}'`);
  if (existing.length > 0) return existing[0].Id;
  const created = await qboRequest<{ Customer: QboRef }>("customer", {
    method: "POST",
    body: JSON.stringify({ DisplayName: name }),
  });
  return created.Customer.Id;
}

export async function findOrCreateItem(
  sku: string,
  description: string,
  unitPriceDollars: number,
  incomeAccountId: string,
): Promise<string> {
  const existing = await qboQuery<QboRef>("Item", `select * from Item where Name = '${escapeQbo(sku)}'`);
  if (existing.length > 0) return existing[0].Id;
  const created = await qboRequest<{ Item: QboRef }>("item", {
    method: "POST",
    body: JSON.stringify({
      Name: sku.slice(0, 100),
      Type: "Service",
      IncomeAccountRef: { value: incomeAccountId },
      UnitPrice: unitPriceDollars,
      Description: description.slice(0, 4000),
    }),
  });
  return created.Item.Id;
}

export interface EstimateLineInput {
  itemId: string;
  description: string;
  quantity: number;
  unitPriceDollars: number;
  amountDollars: number;
}

export async function createEstimate(customerId: string, lines: EstimateLineInput[]): Promise<string> {
  const body = {
    CustomerRef: { value: customerId },
    Line: lines.map((l) => ({
      DetailType: "SalesItemLineDetail",
      Amount: l.amountDollars,
      Description: l.description.slice(0, 4000),
      SalesItemLineDetail: {
        ItemRef: { value: l.itemId },
        Qty: l.quantity,
        UnitPrice: l.unitPriceDollars,
      },
    })),
  };
  const created = await qboRequest<{ Estimate: QboRef }>("estimate", { method: "POST", body: JSON.stringify(body) });
  return created.Estimate.Id;
}
