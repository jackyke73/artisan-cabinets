import { TemplateBanner } from "../TemplateBanner";

export const metadata = { title: "Terms of Service — Artisan Cabinets" };

export default function TermsOfService() {
  return (
    <article className="prose mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <TemplateBanner />
      <h1 className="text-2xl font-semibold">Terms of Service / End-User License Agreement</h1>
      <p className="text-muted-foreground">Effective date: [DATE]. Last updated: [DATE].</p>

      <p>
        These terms govern use of the internal quoting application (the &quot;App&quot;) provided by [Artisan Cabinets /
        Company Legal Name] (&quot;we&quot;) to its authorized users (&quot;you&quot;). By using the App you agree to
        these terms.
      </p>

      <h2 className="text-lg font-semibold">License</h2>
      <p>
        We grant authorized staff a limited, non-exclusive, non-transferable right to use the App for internal business
        purposes only — preparing customer quotes and, where enabled, creating QuickBooks Estimates.
      </p>

      <h2 className="text-lg font-semibold">Acceptable use</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Use the App only for legitimate business of [Company Legal Name].</li>
        <li>Keep access credentials confidential; do not share your login.</li>
        <li>Do not attempt to disrupt, reverse engineer, or gain unauthorized access to the App or connected systems.</li>
      </ul>

      <h2 className="text-lg font-semibold">QuickBooks connection</h2>
      <p>
        Connecting QuickBooks Online authorizes the App to read and create the records described in our{" "}
        <a className="underline" href="/legal/privacy">
          Privacy Policy
        </a>{" "}
        on your behalf. You are responsible for reviewing quotes and Estimates for accuracy before sending them to
        customers. You may disconnect QuickBooks at any time.
      </p>

      <h2 className="text-lg font-semibold">Accuracy &amp; no warranty</h2>
      <p>
        Automated code matching and pricing are aids, not a substitute for review. The App is provided
        &quot;as is&quot; without warranties of any kind. Prices, availability, and quotes must be verified before being
        relied upon.
      </p>

      <h2 className="text-lg font-semibold">Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of the
        App, including pricing or data-entry errors. [Adjust with counsel for your jurisdiction.]
      </p>

      <h2 className="text-lg font-semibold">Changes &amp; termination</h2>
      <p>
        We may modify these terms or discontinue the App at any time. Continued use after changes constitutes
        acceptance. Contact: [support@yourcompany.com].
      </p>
    </article>
  );
}
