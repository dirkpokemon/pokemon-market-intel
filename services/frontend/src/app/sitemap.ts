import type { MetadataRoute } from 'next';
import { cardPath } from '@/lib/cardUrl';
import { SITE_URL } from '@/lib/site';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Rebuilt at most once a day; card prices change twice a day but the URLs rarely do
export const revalidate = 86400;

const STATIC = ['/', '/prijscheck', '/lijstprijs', '/graden', '/pricing', '/privacy', '/terms', '/legal'];

interface CardRef {
  card_number: string;
  language: string;
  product_name: string;
  product_set?: string | null;
  collector_number?: string | null;
  calculated_at?: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = STATIC.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly' }));
  try {
    const res = await fetch(`${API_URL}/api/v1/cards`, { next: { revalidate } });
    if (res.ok) {
      const cards = (await res.json()) as CardRef[];
      for (const c of cards) {
        pages.push({
          url: `${SITE_URL}${cardPath(c)}`,
          lastModified: c.calculated_at ? new Date(c.calculated_at) : undefined,
          changeFrequency: 'daily',
        });
      }
    }
  } catch {
    /* API unreachable while building: the static pages are still listed */
  }
  return pages;
}
