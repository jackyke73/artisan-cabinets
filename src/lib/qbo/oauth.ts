import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  QBO_AUTHORIZE_URL,
  QBO_CLIENT_ID,
  QBO_ENV,
  QBO_REDIRECT_URI,
  QBO_SCOPE,
  QBO_TOKEN_URL,
  basicAuthHeader,
} from "./config";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds (~3600)
  x_refresh_token_expires_in: number; // seconds (~101 days)
  token_type: string;
}

/** The Intuit consent screen URL. `state` is a CSRF nonce we verify on callback. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QBO_CLIENT_ID,
    response_type: "code",
    scope: QBO_SCOPE,
    redirect_uri: QBO_REDIRECT_URI,
    state,
  });
  return `${QBO_AUTHORIZE_URL}?${params.toString()}`;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

function expiryDates(t: TokenResponse) {
  const now = Date.now();
  return {
    accessExpiresAt: new Date(now + t.expires_in * 1000),
    refreshExpiresAt: new Date(now + t.x_refresh_token_expires_in * 1000),
  };
}

/** Exchange the authorization code for tokens and persist the connection. */
export async function exchangeCodeAndSave(code: string, realmId: string): Promise<void> {
  const tokens = await postToken(
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: QBO_REDIRECT_URI }),
  );
  const { accessExpiresAt, refreshExpiresAt } = expiryDates(tokens);
  const accessToken = encryptSecret(tokens.access_token);
  const refreshToken = encryptSecret(tokens.refresh_token);
  await db.quickBooksConnection.upsert({
    where: { realmId },
    create: { realmId, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, environment: QBO_ENV },
    update: { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, environment: QBO_ENV },
  });
}

export async function getConnection() {
  return db.quickBooksConnection.findFirst({ orderBy: { updatedAt: "desc" } });
}

/**
 * Return a valid access token + realmId, refreshing if the access token is
 * within 60s of expiry. Throws if not connected.
 */
export async function ensureAccessToken(): Promise<{ accessToken: string; realmId: string }> {
  const conn = await getConnection();
  if (!conn) throw new Error("QuickBooks is not connected.");

  if (conn.accessExpiresAt.getTime() - Date.now() > 60_000) {
    return { accessToken: decryptSecret(conn.accessToken), realmId: conn.realmId };
  }

  const tokens = await postToken(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: decryptSecret(conn.refreshToken) }),
  );
  const { accessExpiresAt, refreshExpiresAt } = expiryDates(tokens);
  await db.quickBooksConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      accessExpiresAt,
      refreshExpiresAt,
    },
  });
  return { accessToken: tokens.access_token, realmId: conn.realmId };
}

export async function disconnect(): Promise<void> {
  await db.quickBooksConnection.deleteMany();
}
