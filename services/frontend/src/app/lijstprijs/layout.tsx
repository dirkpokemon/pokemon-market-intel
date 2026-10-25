import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lijstprijs inclusief verzending',
  description:
    'Plak je Pokémon-wantlist of decklist en zie de goedkoopste combinatie van verkopers in Europa — inclusief geschatte verzendkosten.',
  openGraph: {
    title: 'Wat kost je Pokémon-lijst écht? | TCG Pulse',
    description: 'De goedkoopste combinatie van verkopers voor je hele lijst, met verzending meegerekend.',
  },
};

export default function ListPriceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
