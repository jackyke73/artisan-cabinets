import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artisan Cabinets — Quote Builder",
  description: "Paste a customer request, auto-match cabinet codes, export a quote.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-white">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
              <Link href="/" className="font-semibold text-lg">
                Artisan Cabinets
              </Link>
              <nav className="flex gap-4 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/quotes/new" className="hover:text-foreground">
                  New Quote
                </Link>
                <Link href="/quotes" className="hover:text-foreground">
                  Quotes
                </Link>
                <Link href="/customers" className="hover:text-foreground">
                  Customers
                </Link>
                <Link href="/catalog" className="hover:text-foreground">
                  Catalog
                </Link>
                <Link href="/catalog/import" className="hover:text-foreground">
                  Import
                </Link>
                <Link href="/settings/quickbooks" className="hover:text-foreground">
                  QuickBooks
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl w-full px-4 py-6 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
