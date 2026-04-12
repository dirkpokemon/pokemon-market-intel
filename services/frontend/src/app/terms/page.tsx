import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Terms of Service · TCG Pulse',
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
            By using TCG Pulse (&quot;the Service&quot;), you agree to these terms. If you do not
            agree, please do not use the Service.
          </p>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">1. The service</h2>
            <p>
              We provide market data, analytics, and related tools for informational purposes only. We do not provide
              financial, investment, or legal advice. Prices and availability on third-party marketplaces may differ
              from what you see here.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">2. Accounts</h2>
            <p>
              You are responsible for keeping your login credentials secure and for activity under your account. You must
              provide accurate registration information and keep your email address up to date.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">3. Subscriptions &amp; payments</h2>
            <p>
              Paid plans are billed according to the pricing shown at checkout. Cancellations and refunds follow the
              policy stated at purchase (e.g. Stripe checkout). We may change prices or features with reasonable notice
              where required.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">4. Acceptable use</h2>
            <p>
              Do not misuse the Service: no scraping or automated access beyond what we allow, no interference with our
              infrastructure, and no use that violates applicable law or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">5. Limitation of liability</h2>
            <p>
              The Service is provided &quot;as is&quot;. To the extent permitted by law, we are not liable for indirect
              or consequential damages, or for losses arising from reliance on market data or third-party sources.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">6. Contact</h2>
            <p>
              Questions about these terms? Use the{' '}
              <Link href="/privacy" className="text-gray-900 underline hover:no-underline">
                Privacy
              </Link>{' '}
              page or the Contact link in the site footer to reach us by email.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
