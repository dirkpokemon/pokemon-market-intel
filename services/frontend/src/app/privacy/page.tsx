import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Privacy — Pokemon Market Intel EU',
  description: 'Privacy policy for Pokemon Market Intel EU',
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
            Pok&eacute;mon Market Intel EU (&quot;we&quot;) respects your privacy. This page explains what we collect
            and why, in line with common EU practice (including GDPR where it applies).
          </p>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">What we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-gray-800">Account data:</strong> email, name (if provided), password hash, and
                subscription status.
              </li>
              <li>
                <strong className="text-gray-800">Usage &amp; preferences:</strong> settings you save (e.g. notification
                preferences, portfolio/watchlist data stored in your browser or synced where we implement it).
              </li>
              <li>
                <strong className="text-gray-800">Technical data:</strong> standard server logs (e.g. IP, user agent)
                for security and operations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Why we use it</h2>
            <p>
              To run the Service, authenticate you, send service emails (e.g. verification), process subscriptions, improve
              reliability, and comply with law. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Processors &amp; third parties</h2>
            <p>
              We may use providers for hosting, email delivery, payments (e.g. Stripe), and analytics. They process data
              only on our instructions and under appropriate agreements.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Retention</h2>
            <p>
              We keep account and billing records as long as your account is active and for a reasonable period afterward
              for legal and operational needs.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Your rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, delete, or export your data, or to
              object to certain processing. Contact us at{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-gray-900 underline hover:no-underline">
                {SITE_CONTACT_EMAIL}
              </a>{' '}
              and we will respond within a reasonable time.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Cookies</h2>
            <p>
              We use cookies or similar technologies where needed for login sessions and core functionality. Any
              non-essential tracking will be described here if we add it.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Changes</h2>
            <p>We may update this policy; the &quot;Last updated&quot; date will change. Continued use after changes means you accept the updated policy.</p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
