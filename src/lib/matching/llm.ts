import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { statusForConfidence } from "./confidence";
import type { MatchedLine } from "./index";

// Stage 5 — LLM fallback. Only ranks the candidates the deterministic stages
// already retrieved; it can never invent a SKU. Runs only when a key is present
// and never breaks matching (any failure returns the deterministic result).

const LLM_MODEL = process.env.MATCH_LLM_MODEL || "claude-haiku-4-5";
const LLM_MAX_CONFIDENCE = 0.9; // capped below EXACT so borderline picks still get a human glance

export function isLlmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.MATCH_LLM_DISABLED !== "1";
}

/** Lines worth escalating: below auto-accept, but with candidates to choose from. */
export function selectAmbiguous(lines: MatchedLine[]): MatchedLine[] {
  return lines.filter((l) => l.confidence < 0.9 && l.candidates.length > 0);
}

const PickSchema = z.object({
  picks: z.array(
    z.object({
      id: z.number().int(),
      sku: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});
export type LlmPick = z.infer<typeof PickSchema>["picks"][number];

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          sku: { type: ["string", "null"] },
          confidence: { type: "number" },
        },
        required: ["id", "sku", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["picks"],
  additionalProperties: false,
} as const;

/**
 * Apply the model's picks to the ambiguous lines. Pure and defensive: a pick is
 * honored only if its SKU is in that line's candidate set (guards against a
 * hallucinated SKU); an explicit null unbinds the line for manual selection.
 */
export function applyPicks(lines: MatchedLine[], picks: LlmPick[]): MatchedLine[] {
  const pickByLine = new Map(picks.map((p) => [p.id, p]));
  return lines.map((line) => {
    const pick = pickByLine.get(line.lineNumber);
    if (!pick) return line;

    if (pick.sku === null) {
      return { ...line, catalogItemId: null, method: "UNMATCHED", confidence: 0, status: "NEEDS_REVIEW" };
    }
    const candidate = line.candidates.find((c) => c.sku === pick.sku);
    if (!candidate) return line; // hallucinated SKU — ignore, keep deterministic result

    const confidence = Math.min(pick.confidence, LLM_MAX_CONFIDENCE);
    return {
      ...line,
      catalogItemId: candidate.catalogItemId,
      method: "LLM",
      confidence,
      status: statusForConfidence(confidence),
    };
  });
}

/**
 * Refine ambiguous lines with one batched Claude call. Returns the lines
 * unchanged on any failure (no key, network error, bad output) so matching is
 * never blocked by the LLM.
 */
export async function refineLinesWithLLM(lines: MatchedLine[], styleName: string | null): Promise<MatchedLine[]> {
  if (!isLlmEnabled()) return lines;
  const ambiguous = selectAmbiguous(lines);
  if (ambiguous.length === 0) return lines;

  const payload = ambiguous.map((l) => ({
    id: l.lineNumber,
    request: l.rawText,
    candidates: l.candidates.map((c) => ({ sku: c.sku, description: c.description })),
  }));

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: LLM_MODEL,
      max_tokens: 1024,
      system:
        "You match a customer's cabinet order shorthand to catalog SKUs. For each item you are given the raw request text and a short list of candidate SKUs with descriptions. Choose the single best matching SKU from that item's candidates, or null if none is a good fit. You must never output a SKU that is not in that item's candidate list. Return strict JSON.",
      messages: [
        {
          role: "user",
          content:
            (styleName ? `The customer's chosen door style is "${styleName}".\n\n` : "") +
            `Items to match:\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return lines;
    const parsed = PickSchema.safeParse(JSON.parse(textBlock.text));
    if (!parsed.success) return lines;
    return applyPicks(lines, parsed.data.picks);
  } catch (err) {
    console.warn("[matching] LLM refine skipped:", err instanceof Error ? err.message : err);
    return lines;
  }
}
