export interface CatalogLite {
  id: string;
  sku: string;
  description: string;
  priceCents: number;
  styleId: string | null;
  sizeCode: string | null;
}

export interface StyleOption {
  id: string;
  code: string;
  name: string;
}

export interface RowState {
  key: string;
  rawText: string;
  parsedShorthand: string;
  quantity: number;
  catalogItemId: string | null;
  method: string;
  confidence: number;
  candidateIds: string[];
}
