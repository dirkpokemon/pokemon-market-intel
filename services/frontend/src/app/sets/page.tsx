import { Metadata } from 'next';
import SetsClient from './SetsClient';

export const metadata: Metadata = {
  title: 'Browse Sets',
  description: 'Alle Pokémon TCG sets met live EU marktprijzen, deal scores en sealed product prijzen.',
};

async function fetchSetsData() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/sets`, {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SetsPage() {
  const initialData = await fetchSetsData();
  return <SetsClient initialData={initialData} />;
}
