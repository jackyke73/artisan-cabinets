export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-1 text-xl font-semibold">Artisan Cabinets</h1>
      <p className="mb-4 text-sm text-muted-foreground">Enter the shared password to continue.</p>
      <form action="/api/login" method="post" className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <input
          type="password"
          name="password"
          autoFocus
          placeholder="Password"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">Incorrect password.</p>}
        <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Sign in
        </button>
      </form>
    </div>
  );
}
