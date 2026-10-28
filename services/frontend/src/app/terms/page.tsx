import PublicHeader from '@/components/PublicHeader';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Algemene voorwaarden',
  description: 'Algemene voorwaarden van TCG Pulse',
};

const h2 = 'text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-2';
const link = 'text-gray-900 dark:text-white underline hover:no-underline';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <PublicHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Algemene voorwaarden</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">Laatst bijgewerkt: oktober 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <p>
            Door TCG Pulse (&quot;de dienst&quot;) te gebruiken, aangeboden door [NAAM / BEDRIJFSNAAM] (&quot;wij&quot;),
            ga je akkoord met deze voorwaarden. Ga je niet akkoord, gebruik de dienst dan niet. Alle gegevens van de
            aanbieder staan in het <Link href="/legal" className={link}>colofon</Link>.
          </p>

          <section>
            <h2 className={h2}>1. De dienst</h2>
            <p>
              We bieden marktgegevens en analyses over Pokémon-ruilkaarten, alleen ter informatie, op basis van prijzen op
              CardTrader. We geven geen financieel, beleggings- of juridisch advies. Prijzen en beschikbaarheid op andere
              marktplaatsen kunnen afwijken van wat je hier ziet, en gegevens kunnen vertraagd of onvolledig zijn. TCG Pulse
              is niet verbonden aan Nintendo of The Pokémon Company.
            </p>
          </section>

          <section>
            <h2 className={h2}>2. Account</h2>
            <p>
              Je bent zelf verantwoordelijk voor het geheimhouden van je inloggegevens en voor wat er met je account
              gebeurt. Geef bij registratie juiste gegevens op en houd je e-mailadres actueel. Je kunt je account altijd
              verwijderen via Instellingen.
            </p>
          </section>

          <section>
            <h2 className={h2}>3. Abonnementen en betaling</h2>
            <p>
              Betaalde abonnementen (zoals Plus) betaal je vooraf, tegen de prijs die bij het afrekenen staat, via onze
              betaalprovider Stripe. Een abonnement wordt automatisch verlengd voor dezelfde periode, totdat je opzegt.
              Opzeggen kan altijd via Instellingen → Abonnement beheren; het abonnement wordt dan niet meer verlengd en je
              houdt toegang tot het einde van de betaalde periode. We kunnen prijzen of functies wijzigen; dat laten we
              ruim van tevoren weten.
            </p>
          </section>

          <section>
            <h2 className={h2}>4. Herroepingsrecht en terugbetaling</h2>
            <p>
              Ben je consument in de EU, dan heb je bij een aankoop wettelijk 14 dagen bedenktijd. Omdat de dienst digitaal
              is en direct start, stem je er bij het afsluiten van een abonnement mee in dat we binnen de bedenktijd
              beginnen; voor zover de wet dat toestaat vervalt je herroepingsrecht zodra de dienst is gestart. Daarnaast
              geven we vrijwillig 30 dagen geld-terug-garantie op je eerste betaalde abonnement: neem binnen 30 dagen na je
              eerste betaling contact met ons op en je krijgt je geld terug.
            </p>
          </section>

          <section>
            <h2 className={h2}>5. Toegestaan gebruik</h2>
            <p>
              Gebruik de dienst niet verkeerd: geen scraping of geautomatiseerde toegang buiten wat we toestaan, geen
              verstoring van onze systemen, geen doorverkoop van de gegevens en geen gebruik dat in strijd is met de wet of
              met rechten van anderen.
            </p>
          </section>

          <section>
            <h2 className={h2}>6. Aansprakelijkheid</h2>
            <p>
              De dienst wordt geleverd zoals hij is. Voor zover de wet dat toestaat, zijn we niet aansprakelijk voor
              indirecte schade of gevolgschade, of voor verlies doordat je op marktgegevens of bronnen van derden bent
              afgegaan. Niets in deze voorwaarden beperkt aansprakelijkheid die volgens de wet niet beperkt mag worden,
              waaronder je dwingende rechten als consument.
            </p>
          </section>

          <section>
            <h2 className={h2}>7. Toepasselijk recht</h2>
            <p>
              Op deze voorwaarden is Nederlands recht van toepassing, onverminderd de dwingende consumentenbescherming van
              het land waar je woont. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland, tenzij dwingend
              recht iets anders bepaalt.
            </p>
          </section>

          <section>
            <h2 className={h2}>8. Contact</h2>
            <p>
              Vragen over deze voorwaarden? Kijk in de <Link href="/privacy" className={link}>privacyverklaring</Link> of
              het <Link href="/legal" className={link}>colofon</Link>, of mail ons via de contactlink onderaan de pagina.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
