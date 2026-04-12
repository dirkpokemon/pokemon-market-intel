export type TourRole = 'free' | 'subscriber';

export interface TourStep {
  page: string;
  pageLabel: string;
  title: string;
  body: string;
  actionLink?: { href: string; label: string };
}

export function getTourSteps(role: TourRole): TourStep[] {
  return [
    {
      page: '/home',
      pageLabel: 'Home',
      title: 'Jouw dashboard',
      body: 'Dit is je commandocentrum. Gebruik de zoekbalk om elke kaart te vinden in 170K+ EU-aanbiedingen. De stats hieronder geven je een snelle marktindruk.',
    },
    {
      page: '/deals',
      pageLabel: 'Top Deals',
      title: 'Deal Score uitgelegd',
      body: 'Elke kaart krijgt een Deal Score van 0 tot 100. Hoe hoger de score, hoe beter de prijs ten opzichte van het EU-marktgemiddelde. Klik een kaart aan voor kooplinks op CardMarket, CardTrader en eBay.',
    },
    {
      page: '/insights',
      pageLabel: 'Market Pulse',
      title: role === 'subscriber' ? 'Volledig marktoverzicht' : 'Marktoverzicht (gratis sample)',
      body:
        role === 'subscriber'
          ? 'Zie de EU-markt in één oogopslag: kopers- of verkopersmarkt, meest actieve sets, dealkwaliteit en signalen. Alle data wordt elk uur vernieuwd.'
          : 'Je ziet een gratis sample van het marktoverzicht. Upgrade naar Plus voor alle sets, de dealkwaliteitsverdeling en het volledige signaaloverzicht.',
      actionLink:
        role === 'free' ? { href: '/pricing', label: 'Bekijk Plus plannen' } : undefined,
    },
    {
      page: '/signals',
      pageLabel: 'Signals',
      title: role === 'subscriber' ? 'Jouw signalenlijst' : 'Signals (Plus-functie)',
      body:
        role === 'subscriber'
          ? 'Signals detecteren elk uur prijsbewegingen, aanbodverschuivingen en momentum. Klik een signaal uit voor aanbevolen acties en directe kooplinks. Filter op type of zoek op kaartnaam.'
          : 'Signals detecteren elk uur prijsbewegingen en momentum. De volledige feed zit in Plus en Business. Hier zie je een preview.',
      actionLink:
        role === 'free'
          ? { href: '/pricing', label: 'Signals ontgrendelen met Plus' }
          : undefined,
    },
    {
      page: '/portfolio',
      pageLabel: 'Portfolio',
      title: 'Beheer je collectie',
      body: 'Voeg kaarten toe die je bezit met aankoopprijzen. Wij vergelijken ze met live marktdata zodat je altijd je winst of verlies weet. Kaarten op je watchlist verschijnen hier ook.',
    },
  ];
}

export interface TourState {
  active: boolean;
  step: number;
}

export function getTourState(): TourState {
  if (typeof window === 'undefined') return { active: false, step: 0 };
  return {
    active: localStorage.getItem('tour_active') === 'true',
    step: parseInt(localStorage.getItem('tour_step') || '0', 10),
  };
}

export function activateTour(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tour_active', 'true');
  localStorage.setItem('tour_step', '0');
  localStorage.setItem('onboarding_completed', 'true');
  window.dispatchEvent(new Event('tour-started'));
}

export function setTourStep(step: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tour_step', String(step));
}

export function completeTour(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tour_active', 'false');
  localStorage.setItem('onboarding_completed', 'true');
}

export function getTourRole(): TourRole {
  if (typeof window === 'undefined') return 'free';
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      const r: string = user?.role || 'free';
      return ['paid', 'pro', 'admin'].includes(r) ? 'subscriber' : 'free';
    }
  } catch {
    /* ignore */
  }
  return 'free';
}
