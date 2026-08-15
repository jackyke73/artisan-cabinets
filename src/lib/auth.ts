// Minimal shared-password gate. When APP_PASSWORD is unset, auth is disabled and
// the whole app is open (fine for a single local machine). This is a simple
// office gate, not per-user accounts — that's a later upgrade (Auth.js).

export const AUTH_COOKIE = "ac_auth";

/** SHA-256 hex of a string. Works in both the Node and Edge runtimes. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The expected cookie value for the configured password, or null if auth is off. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return sha256Hex(`artisan:${password}`);
}

export function authEnabled(): boolean {
  return !!process.env.APP_PASSWORD;
}
