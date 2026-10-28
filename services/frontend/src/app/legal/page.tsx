import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Colofon',
  description: 'Colofon en gegevens van de aanbieder van TCG Pulse',
};

const h2 = 'text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-2';
const strong = 'text-gray-800 dark:text-gray-200';
const link = 'text-gray-900 dark:text-white underline hover:no-underline';

// NOTE FOR THE OPERATOR: EU e-commerce law (and Dutch law) requires you to
// publish your trader identity before selling to consumers. Replace every
// [PLACEHOLDER] below with your real registered details. Until these are
// filled in, do not charge customers.
export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <PublicHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Colofon</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">Gegevens van de aanbieder</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <section>
            <h2 className={`${h2} mt-2`}>Aanbieder</h2>
            <ul className="list-none pl-0 space-y-1">
              <li><strong className={strong}>Handelsnaam:</strong> TCG Pulse</li>
              <li><strong className={strong}>Aangeboden door:</strong> [NAAM / BEDRIJFSNAAM]</li>
              <li><strong className={strong}>Adres:</strong> [STRAAT, POSTCODE, PLAATS, LAND]</li>
              <li><strong className={strong}>E-mail:</strong>{' '}
                <a href={`mailto:${SITE_CONTACT_EMAIL}`} className={link}>
                  {SITE_CONTACT_EMAIL}
                </a>
              </li>
              <li><strong className={strong}>KvK-nummer:</strong> [KVK-NUMMER]</li>
              <li><strong className={strong}>Btw-nummer:</strong> [BTW-NUMMER]</li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>Verantwoordelijk voor de inhoud</h2>
            <p>[NAAM VERANTWOORDELIJKE], bereikbaar op het adres en e-mailadres hierboven.</p>
          </section>

          <section>
            <h2 className={h2}>Klachten en geschillen</h2>
            <p>
              Heb je een klacht? Mail ons op{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className={link}>
                {SITE_CONTACT_EMAIL}
              </a>{' '}
              en we zoeken samen naar een oplossing. We nemen niet deel aan geschillenbeslechting via een
              consumentengeschillencommissie.
            </p>
          </section>

          <section>
            <h2 className={h2}>Merken en databronnen</h2>
            <p>
              TCG Pulse is een onafhankelijke tool en is niet verbonden aan, goedgekeurd door of gesponsord door Nintendo,
              Creatures Inc., GAME FREAK inc. of The Pokémon Company. Alle productnamen, logo&apos;s en merken zijn eigendom
              van hun respectieve eigenaren en worden alleen gebruikt om producten aan te duiden. Prijsgegevens komen van
              CardTrader en zijn ter informatie.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
