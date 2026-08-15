import { qboConfigured, QBO_ENV, QBO_REDIRECT_URI } from "@/lib/qbo/config";
import { getConnection } from "@/lib/qbo/oauth";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function QuickBooksSettings({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const { connected, disconnected, error } = await searchParams;
  const configured = qboConfigured();
  const conn = configured ? await getConnection() : null;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">QuickBooks Online</h1>

      {connected && <Notice variant="green">Connected to QuickBooks.</Notice>}
      {disconnected && <Notice variant="gray">Disconnected from QuickBooks.</Notice>}
      {error && <Notice variant="red">{errorMessage(error)}</Notice>}

      {!configured ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Not set up yet — add your Intuit app credentials.</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              At <span className="font-mono">developer.intuit.com</span>, create an app (&quot;QuickBooks Online and
              Payments&quot;).
            </li>
            <li>
              Add this exact Redirect URI: <span className="font-mono">{QBO_REDIRECT_URI}</span>
            </li>
            <li>
              Put the Development Client ID + Secret in <span className="font-mono">.env</span> as{" "}
              <span className="font-mono">QBO_CLIENT_ID</span> and <span className="font-mono">QBO_CLIENT_SECRET</span>,
              then restart.
            </li>
          </ol>
        </div>
      ) : conn ? (
        <div className="space-y-4 rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="green">Connected</Badge>
            <Badge variant="gray">{conn.environment}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-muted-foreground">Company (realm) ID</dt>
            <dd className="font-mono">{conn.realmId}</dd>
            <dt className="text-muted-foreground">Access token renews</dt>
            <dd>{conn.accessExpiresAt.toLocaleString("en-US")}</dd>
            <dt className="text-muted-foreground">Reconnect needed by</dt>
            <dd>{conn.refreshExpiresAt.toLocaleDateString("en-US")}</dd>
          </dl>
          <form action="/api/qbo/disconnect" method="post">
            <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Disconnect</button>
          </form>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Credentials detected ({QBO_ENV}). Connect your QuickBooks company to enable pushing quotes as Estimates.
          </p>
          <a
            href="/api/qbo/connect"
            className="inline-flex rounded-md bg-[#2CA01C] px-4 py-2 text-sm font-medium text-white hover:brightness-95"
          >
            Connect to QuickBooks
          </a>
        </div>
      )}
    </div>
  );
}

function Notice({ variant, children }: { variant: "green" | "red" | "gray"; children: React.ReactNode }) {
  const cls = {
    green: "border-green-200 bg-green-50 text-green-800",
    red: "border-red-200 bg-red-50 text-red-800",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  }[variant];
  return <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

function errorMessage(code: string): string {
  switch (code) {
    case "notconfigured":
      return "Add QBO_CLIENT_ID and QBO_CLIENT_SECRET to .env first.";
    case "denied":
      return "QuickBooks authorization was cancelled or denied.";
    case "state":
      return "Security check failed (state mismatch). Please try connecting again.";
    case "exchange":
      return "Could not complete the connection with QuickBooks. Check the app credentials and redirect URI.";
    default:
      return "Something went wrong.";
  }
}
