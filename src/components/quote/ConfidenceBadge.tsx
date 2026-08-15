import { Badge } from "@/components/ui/badge";

export function ConfidenceBadge({
  method,
  confidence,
  matched,
}: {
  method: string;
  confidence: number;
  matched: boolean;
}) {
  if (!matched) return <Badge variant="red">Unmatched</Badge>;
  const pct = Math.round(confidence * 100);
  if (method === "MANUAL") return <Badge variant="green">Manual</Badge>;
  if (confidence >= 0.9) {
    return (
      <Badge variant="green">
        {method === "ALIAS" ? "Learned" : "Auto"} {pct}%
      </Badge>
    );
  }
  if (confidence >= 0.6) return <Badge variant="yellow">Review {pct}%</Badge>;
  return <Badge variant="red">Low {pct}%</Badge>;
}
