import { Metadata } from 'next';
import SetDetailClient from './SetDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchSetBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/sets`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.sets as Array<{ slug: string; name: string; tcg_api_id?: string; deal_count: number }>)
      .find(s => s.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { setId: string } }
): Promise<Metadata> {
  const set = await fetchSetBySlug(params.setId);
  if (!set) return { title: 'Set' };

  const ogTitle = `${set.name} | TCG Pulse`;
  const description = `Live EU marktprijzen, deal scores en sealed product prijzen voor ${set.name}.${set.deal_count > 0 ? ` ${set.deal_count} actieve deals.` : ''}`;
  const images = set.tcg_api_id
    ? [{ url: `https://images.pokemontcg.io/${set.tcg_api_id}/logo.png`, width: 400, height: 100 }]
    : [];

  return {
    title: set.name,
    description,
    openGraph: { title: ogTitle, description, images },
    twitter: { card: 'summary', title: ogTitle, description, images: images.map(i => i.url) },
  };
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/v1/sets`, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.sets as Array<{ slug: string }>).map(s => ({ setId: s.slug }));
  } catch {
    return [];
  }
}

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  return <SetDetailClient params={params} />;
}
