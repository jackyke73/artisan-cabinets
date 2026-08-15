// QuickBooks Online connection config, all from env. Nothing here is secret at
// rest except what you put in .env (QBO_CLIENT_SECRET).

export const QBO_ENV = process.env.QBO_ENV === "production" ? "production" : "sandbox";
export const QBO_CLIENT_ID = process.env.QBO_CLIENT_ID || "";
export const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET || "";
export const QBO_REDIRECT_URI = process.env.QBO_REDIRECT_URI || "http://localhost:3000/api/qbo/callback";

export const QBO_SCOPE = "com.intuit.quickbooks.accounting";
export const QBO_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export const QBO_API_BASE =
  QBO_ENV === "production" ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";

/** True once the Intuit app credentials are present in the environment. */
export function qboConfigured(): boolean {
  return !!(QBO_CLIENT_ID && QBO_CLIENT_SECRET);
}

export function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`).toString("base64");
}
