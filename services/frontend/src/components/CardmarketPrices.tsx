import type { CardmarketPrices as Prices } from '@/lib/api';
import { eur } from '@/lib/format';

/** Cardmarket's price guide next to our CardTrader numbers (no hooks: usable in server components). */
export default function CardmarketPrices({ prices }: { prices?: Prices | null }) {
  if (!prices || prices.trend == null) return null;
  const updated = prices.updated_at
    ? new Date(prices.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
    : null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-sm font-semibold">Op Cardmarket</p>
      <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Trendprijs</dt>
          <dd className="font-semibold">{eur(prices.trend)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Gem. verkoop 30 dagen</dt>
          <dd className="font-semibold">{eur(prices.avg30)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Laagste aanbod</dt>
          <dd className="font-semibold">{eur(prices.low)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Bron: prijsgids van Cardmarket{updated ? `, ${updated}` : ''}. Alle talen en condities samen, dus niet een-op-een
        vergelijkbaar met de near-mint-prijs hierboven.
      </p>
    </div>
  );
}
