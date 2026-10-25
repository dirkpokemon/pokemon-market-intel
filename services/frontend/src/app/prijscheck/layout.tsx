import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gratis prijscheck',
  description:
    'Is dit een eerlijke prijs? Plak een advertentie van Marktplaats, Vinted of Facebook en zie direct wat een Pokémon-kaart in Europa normaal kost.',
  openGraph: {
    title: 'Gratis Pokémon-prijscheck | TCG Pulse',
    description: 'Zie direct of een prijs normaal, scherp, verdacht laag of te duur is — op basis van het Europese aanbod.',
  },
};

export default function PriceCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
