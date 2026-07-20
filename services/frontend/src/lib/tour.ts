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
      title: 'Your dashboard',
      body: 'This is your command center. Use the search bar to find any card across 170K+ EU listings. The stats below give you a quick read on the market.',
    },
    {
      page: '/deals',
      pageLabel: 'Top Deals',
      title: 'Deal Score explained',
      body: 'Each card gets a Deal Score from 0 to 100. The higher the score, the better the price versus the EU market average. Click a card for buy links on CardMarket, CardTrader, and eBay.',
      actionLink:
        role === 'free' ? { href: '/pricing', label: 'View Plus plans' } : undefined,
    },
    {
      page: '/watchlist',
      pageLabel: 'Watchlist',
      title: 'Price alerts on your cards',
      body: 'Add any card with a target price. When the EU market drops to your target, we email or Telegram you automatically. No need to check back daily.',
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
