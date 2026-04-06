/**
 * Subscription tiers: internal roles stay `paid` | `pro` (API/DB).
 * Display names: Plus / Business.
 */

export type AppTier = 'free' | 'paid' | 'pro';

export const TIER_LABEL: Record<AppTier, string> = {
  free: 'Free',
  paid: 'Plus',
  pro: 'Business',
};

/** Short badge for nav/features that need any paying plan (Plus or Business). */
export const SUBSCRIBER_BADGE = 'Plus+';

export function tierLabel(role: string | undefined | null): string {
  const r = (role || 'free').toLowerCase();
  if (r === 'admin') return 'Admin';
  if (r === 'pro') return TIER_LABEL.pro;
  if (r === 'paid') return TIER_LABEL.paid;
  return TIER_LABEL.free;
}

export function isSubscriberRole(role: string | undefined | null): boolean {
  const r = (role || 'free').toLowerCase();
  return r === 'paid' || r === 'pro' || r === 'admin';
}

export const PLAN_FEATURES = {
  free: [
    'Top 20 deal scores (score ≥ 65)',
    'Basic market statistics',
    'Portfolio & watchlist',
    'Card search (170K+ listings)',
    'Community support',
  ],
  paid: [
    'Unlimited deal scores',
    'Full Signals feed (momentum, supply, set trends)',
    'Market Pulse insights',
    'Email & Telegram alerts',
    'Hourly-updated EU listings data',
    'Priority support',
  ],
  pro: [
    'Everything in Plus',
    'Same product access today — we ship Business-only tools first',
    'Next: read-only API & bulk data export',
    'Next: advanced alert rules',
    'Best for shops and power users',
  ],
} as const;

/** CTA for free users upgrading to the first paid tier. */
export const CTA_SUBSCRIBE_PLUS = 'Subscribe — Plus';

/** CTA for free users choosing Business (checkout). */
export const CTA_GET_BUSINESS = 'Get Business';

/** CTA for Plus subscribers moving to Business (in-app upgrade). */
export const CTA_UPGRADE_BUSINESS = 'Upgrade to Business';

/** Free-user upsell lines (replace vague “Premium”). */
export const UPSELL_SUBSCRIBE = 'Upgrade to Plus';
