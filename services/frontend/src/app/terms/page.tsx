import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for TCG Pulse',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-gray-900 hover:text-gray-600">
            &larr; Home
          </Link>
          <Link href="/login" className="text-xs text-gray-500 hover:text-gray-700">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: April 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600">
          <p>
            By using TCG Pulse (&quot;the Service&quot;), operated by [LEGAL NAME / COMPANY] (&quot;we&quot;), you agree
            to these terms. If you do not agree, please do not use the Service. Our full provider details are on the{' '}
            <Link href="/legal" className="text-gray-900 underline hover:no-underline">Legal notice</Link> page.
          </p>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">1. The service</h2>
            <p>
              We provide market data and analytics for Pokémon TCG singles for informational purposes only, based on
              price data from CardTrader. We do not provide financial, investment, or legal advice. Prices and
              availability on third-party marketplaces may differ from what you see here, and data may be delayed or
              incomplete. TCG Pulse is not affiliated with Nintendo or The Pokémon Company.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">2. Accounts</h2>
            <p>
              You are responsible for keeping your login credentials secure and for activity under your account. You must
              provide accurate registration information and keep your email address up to date. You can delete your
              account at any time under Settings.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">3. Subscriptions &amp; payments</h2>
            <p>
              Paid plans (e.g. Plus) are billed in advance at the price shown at checkout, through our payment provider
              Stripe. Subscriptions renew automatically for the same period until you cancel. You can cancel at any time
              via the billing portal (Settings → Manage billing); cancellation stops the next renewal and you keep access
              until the end of the paid period. We may change prices or features with reasonable advance notice.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">4. Right of withdrawal &amp; refunds</h2>
            <p>
              If you are an EU consumer, you have a statutory right to withdraw from a purchase within 14 days. Because
              the Service is digital content/services provided immediately, by subscribing you agree that we begin
              performance during the withdrawal period; you acknowledge you lose the statutory right of withdrawal once
              performance has begun, to the extent permitted by law. In addition, we offer a voluntary 30-day
              money-back guarantee on first-time paid subscriptions: contact us within 30 days of your first payment for
              a refund.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">5. Acceptable use</h2>
            <p>
              Do not misuse the Service: no scraping or automated access beyond what we allow, no interference with our
              infrastructure, no reselling of the data, and no use that violates applicable law or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">6. Limitation of liability</h2>
            <p>
              The Service is provided &quot;as is&quot;. To the extent permitted by law, we are not liable for indirect
              or consequential damages, or for losses arising from reliance on market data or third-party sources.
              Nothing in these terms limits liability that cannot be limited under applicable law, including your
              mandatory statutory consumer rights.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">7. Governing law</h2>
            <p>
              These terms are governed by the laws of the Netherlands, without prejudice to the mandatory consumer
              protection rules of your country of residence. Disputes are subject to the competent courts of the
              Netherlands, unless mandatory law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">8. Contact</h2>
            <p>
              Questions about these terms? Use the{' '}
              <Link href="/privacy" className="text-gray-900 underline hover:no-underline">
                Privacy
              </Link>{' '}
              or{' '}
              <Link href="/legal" className="text-gray-900 underline hover:no-underline">
                Legal notice
              </Link>{' '}
              page, or the Contact link in the site footer to reach us by email.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
