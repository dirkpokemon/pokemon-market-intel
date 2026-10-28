import PublicHeader from '@/components/PublicHeader';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Privacyverklaring',
  description: 'Hoe TCG Pulse met je persoonsgegevens omgaat',
};

const h2 = 'text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-2';
const strong = 'text-gray-800 dark:text-gray-200';
const link = 'text-gray-900 dark:text-white underline hover:no-underline';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <PublicHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacyverklaring</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">Laatst bijgewerkt: oktober 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <p>
            In deze verklaring lees je hoe TCG Pulse je persoonsgegevens verwerkt volgens de Algemene Verordening
            Gegevensbescherming (AVG).
          </p>

          <section>
            <h2 className={h2}>Verwerkingsverantwoordelijke</h2>
            <p>
              Verantwoordelijk voor je gegevens is <strong className={strong}>[NAAM / BEDRIJFSNAAM]</strong>, [ADRES].
              Contact:{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className={link}>
                {SITE_CONTACT_EMAIL}
              </a>
              . Alle gegevens van de aanbieder staan in het{' '}
              <Link href="/legal" className={link}>colofon</Link>.
            </p>
          </section>

          <section>
            <h2 className={h2}>Welke gegevens we verwerken, waarom en op welke grondslag</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className={strong}>Accountgegevens</strong> (e-mailadres, naam als je die opgeeft, versleuteld
                wachtwoord): om je account aan te maken en te beveiligen. Grondslag: uitvoering van de overeenkomst met
                jou (art. 6 lid 1 sub b AVG).
              </li>
              <li>
                <strong className={strong}>Watchlist en meldingsinstellingen</strong>: om de alerts te versturen die je
                zelf aanzet. Grondslag: uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG); welke meldingen je
                krijgt, kies je zelf.
              </li>
              <li>
                <strong className={strong}>Abonnements- en betaalstatus</strong>: om betaalde abonnementen te beheren.
                Grondslag: uitvoering van de overeenkomst en onze wettelijke verplichtingen (art. 6 lid 1 sub b en c AVG).
              </li>
              <li>
                <strong className={strong}>Technische logs</strong> (IP-adres, browsergegevens): voor beveiliging en een
                goed werkende dienst. Grondslag: ons gerechtvaardigd belang bij een veilige dienst (art. 6 lid 1 sub f AVG).
              </li>
            </ul>
            <p className="mt-2">We verkopen je gegevens niet en gebruiken ze niet voor advertenties van derden.</p>
          </section>

          <section>
            <h2 className={h2}>Verwerkers en doorgifte buiten de EU</h2>
            <p>
              We werken met dienstverleners die gegevens namens ons verwerken: <strong className={strong}>Railway</strong>{' '}
              (hosting en database), <strong className={strong}>Google</strong> (e-mail via Gmail) en{' '}
              <strong className={strong}>Stripe</strong> (betalingen). Sommige van deze partijen verwerken gegevens buiten
              de EU/EER, onder meer in de Verenigde Staten. In dat geval is de doorgifte beschermd met passende waarborgen,
              zoals de standaardcontractbepalingen van de Europese Commissie. Betaalkaartgegevens gaan rechtstreeks naar
              Stripe; wij zien of bewaren nooit volledige kaartnummers.
            </p>
          </section>

          <section>
            <h2 className={h2}>Bewaartermijnen</h2>
            <p>
              We bewaren accountgegevens zolang je account bestaat. Verwijder je je account, dan worden je account en je
              watchlist gewist. Betaalgegevens bewaren we langer als de wet dat verplicht (bijvoorbeeld de fiscale
              bewaarplicht).
            </p>
          </section>

          <section>
            <h2 className={h2}>Je rechten</h2>
            <p>
              Je hebt het recht op inzage, correctie en verwijdering van je gegevens, op beperking van en bezwaar tegen de
              verwerking, en op overdraagbaarheid van je gegevens. Je kunt je account en persoonsgegevens altijd zelf
              verwijderen via <strong className={strong}>Instellingen → Account verwijderen</strong>, of mail ons op{' '}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className={link}>
                {SITE_CONTACT_EMAIL}
              </a>
              . Je kunt ook een klacht indienen bij de toezichthouder: in Nederland de Autoriteit Persoonsgegevens
              (autoriteitpersoonsgegevens.nl).
            </p>
          </section>

          <section>
            <h2 className={h2}>Cookies</h2>
            <p>
              We gebruiken alleen cookies en lokale opslag die nodig zijn om ingelogd te blijven en de site te laten werken
              (functioneel). We gebruiken geen marketing- of analysecookies van derden. Bij je eerste bezoek zie je een
              korte melding; dat je die hebt weggeklikt, slaan we lokaal op zodat je hem niet opnieuw ziet. Gaan we ooit
              niet-noodzakelijke tracking gebruiken, dan vragen we eerst je toestemming en beschrijven we het hier.
            </p>
          </section>

          <section>
            <h2 className={h2}>Wijzigingen</h2>
            <p>
              We kunnen deze verklaring aanpassen; de datum bovenaan verandert dan mee. Belangrijke wijzigingen laten we je
              weten als dat verplicht is.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
