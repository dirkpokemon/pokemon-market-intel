import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Legal notice',
  description: 'Legal notice and provider identification for TCG Pulse',
};

// NOTE FOR THE OPERATOR: EU e-commerce law (and Dutch law) requires you to
// publish your trader identity before selling to consumers. Replace every
// [PLACEHOLDER] below with your real registered details. Until these are
// filled in, do not charge customers.
export default function LegalPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Legal notice</h1>
        <p className="text-xs text-gray-400 mb-8">Provider identification (Impressum)</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-2 mb-2">Provider</h2>
            <ul className="list-none pl-0 space-y-1">
              <li><strong className="text-gray-800">Trade name:</strong> TCG Pulse</li>
              <li><strong className="text-gray-800">Operated by:</strong> [LEGAL NAME / COMPANY]</li>
              <li><strong className="text-gray-800">Address:</strong> [STREET, POSTAL CODE, CITY, COUNTRY]</li>
              <li><strong className="text-gray-800">Email:</strong>{' '}
                <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-gray-900 underline hover:no-underline">
                  {SITE_CONTACT_EMAIL}
                </a>
              </li>
              <li><strong className="text-gray-800">Chamber of Commerce (KvK):</strong> [KVK NUMBER]</li>
              <li><strong className="text-gray-800">VAT number:</strong> [BTW / VAT NUMBER]</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Responsible for content</h2>
            <p>[NAME OF PERSON RESPONSIBLE], reachable at the address and email above.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Online dispute resolution</h2>
            <p>
              The European Commission provides a platform for online dispute resolution at{' '}
              <a href="https://ec.europa.eu/consumers/odr" className="text-gray-900 underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                ec.europa.eu/consumers/odr
              </a>. We are not obliged and not willing to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Trademarks &amp; data sources</h2>
            <p>
              TCG Pulse is an independent tool and is not affiliated with, endorsed, sponsored, or approved by Nintendo,
              Creatures Inc., GAME FREAK inc., or The Pokémon Company. All product names, logos, and trademarks are the
              property of their respective owners and are used for identification only. Price data is provided by
              CardTrader and is informational.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
