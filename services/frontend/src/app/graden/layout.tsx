import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loont graden?',
  description:
    'Reken uit of je Pokémon-kaart laten graden loont: kosten van PSA Frankfurt of AP Grading tegenover de prijs van de kaart, met wat er nu gegradeerd te koop staat.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
