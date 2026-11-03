import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Account pages: behind a login, nothing to index
      disallow: ['/home', '/deals', '/watchlist', '/settings', '/admin', '/dashboard', '/unsubscribe', '/wachtwoord-herstellen', '/verify'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
