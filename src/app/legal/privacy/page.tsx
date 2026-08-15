import { TemplateBanner } from "../TemplateBanner";

export const metadata = { title: "Privacy Policy — Artisan Cabinets" };

export default function PrivacyPolicy() {
  return (
    <article className="prose mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <TemplateBanner />
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-muted-foreground">Effective date: [DATE]. Last updated: [DATE].</p>

      <p>
        This Privacy Policy explains how [Artisan Cabinets / Company Legal Name] (&quot;we&quot;) handles information in
        connection with our internal quoting application (the &quot;App&quot;). Questions: [privacy@yourcompany.com].
      </p>

      <h2 className="text-lg font-semibold">Information we handle</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Customer and quote data you enter</strong> — customer names and contact details, the requests you
          paste in, and the line items, quantities, and prices on quotes.
        </li>
        <li>
          <strong>Product catalog data</strong> — the SKUs, descriptions, and prices you import.
        </li>
        <li>
          <strong>QuickBooks data</strong> — when you connect QuickBooks Online, we access your customer and item
          records to match or create them and to create Estimates on your behalf. We store QuickBooks record
          identifiers and access tokens needed to maintain the connection.
        </li>
        <li>
          <strong>Account access</strong> — if a shared password is enabled, a session cookie indicating you are signed
          in.
        </li>
      </ul>

      <h2 className="text-lg font-semibold">How we use it</h2>
      <p>
        Solely to provide the App&apos;s features: matching shorthand codes to catalog SKUs, generating quotes and PDFs,
        and — when you choose — pushing quotes to QuickBooks as Estimates. We do not sell your data or use it for
        advertising.
      </p>

      <h2 className="text-lg font-semibold">QuickBooks Online</h2>
      <p>
        Our use of information received from Intuit APIs adheres to the{" "}
        <a className="underline" href="https://developer.intuit.com/app/developer/qbo/docs/develop/tutorials/manage-connections">
          Intuit Developer
        </a>{" "}
        requirements, including any limited-use restrictions. QuickBooks access tokens are stored encrypted at rest, and
        you can disconnect QuickBooks at any time from within the App, which stops further access.
      </p>

      <h2 className="text-lg font-semibold">Storage &amp; security</h2>
      <p>
        Data is stored in our application database with access limited to authorized staff. We use reasonable technical
        measures, including encryption of stored QuickBooks tokens and HTTPS in transit. No method of storage is
        perfectly secure.
      </p>

      <h2 className="text-lg font-semibold">Retention</h2>
      <p>
        We keep quote, customer, and catalog data for as long as needed to run the business, and remove or anonymize it
        on request where feasible. Contact [privacy@yourcompany.com] to request deletion.
      </p>

      <h2 className="text-lg font-semibold">Your choices</h2>
      <p>
        You control what you enter and import, and you can disconnect QuickBooks at any time. To access or delete data,
        contact us at [privacy@yourcompany.com].
      </p>

      <h2 className="text-lg font-semibold">Changes</h2>
      <p>We may update this policy; material changes will be reflected by the &quot;Last updated&quot; date above.</p>
    </article>
  );
}
