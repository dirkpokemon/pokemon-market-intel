/** Public contact address for mailto links and legal pages */
export const SITE_CONTACT_EMAIL = 'pokemonmarketintel@gmail.com';

/** Public base URL (canonical links, sitemap) */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://charming-contentment-production-ce0e.up.railway.app'
).replace(/\/$/, '');
