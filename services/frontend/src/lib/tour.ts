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
      title: 'Je dashboard',
      body: 'Hier begin je. Zoek met de zoekbalk elke kaart in het actuele Europese aanbod. De cijfers eronder geven je in één oogopslag een beeld van de markt.',
    },
    {
      page: '/deals',
      pageLabel: 'Topdeals',
      title: 'Zo werkt de dealscore',
      body: 'Elke kaart krijgt een dealscore van 0 tot 100. Hoe hoger de score, hoe scherper de prijs ten opzichte van wat de kaart in Europa normaal kost. Klik op een kaart voor links naar CardMarket, CardTrader en eBay.',
      actionLink:
        role === 'free' ? { href: '/pricing', label: 'Bekijk Plus' } : undefined,
    },
    {
      page: '/watchlist',
      pageLabel: 'Watchlist',
      title: 'Prijsalerts voor jouw kaarten',
      body: 'Voeg een kaart toe met een doelprijs. Zakt het Europese aanbod tot jouw doelprijs, dan mailen we je automatisch. Zelf elke dag kijken is niet nodig.',
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
