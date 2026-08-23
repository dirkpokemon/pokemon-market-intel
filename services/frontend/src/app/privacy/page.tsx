import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Privacy',
  description: 'Privacy policy for TCG Pulse',
};

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: April 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600">
          <p>
            This policy explains how TCG Pulse processes your personal data under the EU General Data Protection
            Regulation (GDPR).
          </p>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Data controller</h2>
            <p>
              The controller responsible for your data is <strong className="text-gray-800">[LEGAL NAME / COMPANY]</strong>,
              [ADDRESS]. Contact:{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-gray-900 underline hover:no-underline">
                {SITE_CONTACT_EMAIL}
              </a>. Full provider details are on our{' '}
              <Link href="/legal" className="text-gray-900 underline hover:no-underline">Legal notice</Link> page.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">What we collect &amp; why (legal basis)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-gray-800">Account data</strong> (email, name if provided, password hash) — to
                create and secure your account. Legal basis: performance of our contract with you (Art. 6(1)(b)).
              </li>
              <li>
                <strong className="text-gray-800">Watchlist &amp; notification settings</strong> — to run the alert
                features you enable. Legal basis: contract (Art. 6(1)(b)); alerts you switch on are your choice.
              </li>
              <li>
                <strong className="text-gray-800">Subscription &amp; billing status</strong> — to manage paid plans.
                Legal basis: contract and our legal obligations (Art. 6(1)(b),(c)).
              </li>
              <li>
                <strong className="text-gray-800">Technical logs</strong> (IP, user agent) — for security and
                operation. Legal basis: our legitimate interest in a secure service (Art. 6(1)(f)).
              </li>
            </ul>
            <p className="mt-2">We do not sell your personal data and do not use it for third-party advertising.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Processors &amp; international transfers</h2>
            <p>
              We rely on service providers who process data on our behalf: <strong className="text-gray-800">Railway</strong> (hosting/database),
              <strong className="text-gray-800"> Brevo</strong> (email delivery), and <strong className="text-gray-800">Stripe</strong> (payments).
              Some of these providers process data outside the EU/EEA, including in the United States. Where that happens,
              transfers are covered by appropriate safeguards such as the EU Standard Contractual Clauses. Payment card
              details are handled directly by Stripe; we never see or store full card numbers.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Retention</h2>
            <p>
              We keep account data while your account is active. If you delete your account, your account and watchlist
              data are removed. Billing records may be retained where required by law (e.g. tax retention periods).
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Your rights</h2>
            <p>
              You have the right to access, correct, delete, restrict, or object to processing of your data, and to data
              portability. You can delete your account and personal data yourself at any time under{' '}
              <strong className="text-gray-800">Settings → Account verwijderen</strong>, or contact us at{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-gray-900 underline hover:no-underline">
                {SITE_CONTACT_EMAIL}
              </a>. You also have the right to lodge a complaint with your supervisory authority — in the Netherlands, the
              Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Cookies</h2>
            <p>
              We use only cookies/local storage needed for login sessions and core functionality (essential). We do not
              use third-party marketing or analytics cookies. When you first visit you may see a short notice; dismissing
              it is stored locally so we don&apos;t show it again. If we ever add non-essential tracking, we will ask for
              your consent and describe it here.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Changes</h2>
            <p>We may update this policy; the &quot;Last updated&quot; date will change. Material changes will be communicated where required.</p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
