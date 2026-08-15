/**
 * Normalize a code for comparison: uppercase, strip everything that isn't a
 * letter or digit. "bps-a15", "BPS A15", "Bps.A15" all -> "BPSA15".
 */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Given an already-normalized code and a style code, strip the style prefix if
 * present. normalizeCode("BPS-B15") = "BPSB15"; with style "BPS" -> "B15".
 * Leaves the code unchanged when the prefix isn't there.
 */
export function stripStylePrefix(normalizedCode: string, styleCode?: string | null): string {
  if (!styleCode) return normalizedCode;
  const normStyle = normalizeCode(styleCode);
  if (normStyle && normalizedCode.startsWith(normStyle) && normalizedCode.length > normStyle.length) {
    return normalizedCode.slice(normStyle.length);
  }
  return normalizedCode;
}
