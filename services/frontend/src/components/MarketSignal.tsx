/**
 * Buy/wait signal (roadmap #3), computed by the analysis service from the
 * supply of ASKING prices over the last 7 days vs. the days before. A trend,
 * never advice: the wording stays "lijkt" / "may".
 */

export type MarketSignalCode = 'buy' | 'wait' | 'rising' | 'falling' | 'stable';

type Lang = 'nl' | 'en';

const LABELS: Record<Lang, Record<MarketSignalCode, string>> = {
  nl: { buy: 'Koopmoment', wait: 'Wachten', rising: 'Stijgend', falling: 'Dalend', stable: 'Stabiel' },
  en: { buy: 'Buy window', wait: 'Wait', rising: 'Rising', falling: 'Falling', stable: 'Stable' },
};

const TONES: Record<MarketSignalCode, string> = {
  buy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  wait: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  rising: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  falling: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  stable: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
};

const ARROWS: Record<MarketSignalCode, string> = { buy: '↗', wait: '↘', rising: '↗', falling: '↘', stable: '→' };

function isCode(s: string | null | undefined): s is MarketSignalCode {
  return s != null && s in TONES;
}

const pct = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}%`;

export function signalExplanation(
  signal: string | null | undefined,
  floorChange: number | null | undefined,
  supplyChange: number | null | undefined,
  lang: Lang = 'nl',
): string {
  if (!isCode(signal) || floorChange == null || supplyChange == null) {
    return lang === 'nl'
      ? 'Nog te weinig prijsgeschiedenis voor een koop- of wachtsignaal (minstens twee weken nodig).'
      : 'Not enough price history for a buy/wait signal yet (needs at least two weeks).';
  }
  const f = pct(floorChange);
  const s = pct(supplyChange);
  if (lang === 'en') {
    const base = `Last 7 days vs. before: cheapest listing ${f}, listings per day ${s}.`;
    return {
      buy: `${base} Supply is shrinking while prices rise — waiting may cost more.`,
      wait: `${base} More copies on offer and prices falling — waiting may pay off.`,
      rising: `${base} Asking prices are going up.`,
      falling: `${base} Asking prices are going down.`,
      stable: `${base} No clear trend.`,
    }[signal];
  }
  const base = `Afgelopen 7 dagen t.o.v. daarvoor: goedkoopste aanbieding ${f}, aanbod per dag ${s}.`;
  return {
    buy: `${base} Het aanbod krimpt terwijl de prijs stijgt — wachten wordt mogelijk duurder.`,
    wait: `${base} Er komt meer aanbod bij en de prijs zakt — wachten lijkt slim.`,
    rising: `${base} De vraagprijzen gaan omhoog.`,
    falling: `${base} De vraagprijzen gaan omlaag.`,
    stable: `${base} Geen duidelijke trend.`,
  }[signal];
}

export default function SignalBadge({
  signal,
  floorChange,
  supplyChange,
  lang = 'nl',
  className = '',
}: {
  signal: string | null | undefined;
  floorChange?: number | null;
  supplyChange?: number | null;
  lang?: Lang;
  className?: string;
}) {
  if (!isCode(signal)) return null;
  return (
    <span
      title={signalExplanation(signal, floorChange, supplyChange, lang)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${TONES[signal]} ${className}`}
    >
      <span aria-hidden="true">{ARROWS[signal]}</span>
      {LABELS[lang][signal]}
    </span>
  );
}
