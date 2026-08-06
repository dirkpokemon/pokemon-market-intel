/**
 * Subscription tiers: internal roles stay `paid` | `pro` (API/DB).
 * Display names: Plus / Business.
 * Business: waitlist only until API/export ships (mailto flow).
 */

import { SITE_CONTACT_EMAIL } from './site';

export type AppTier = 'free' | 'paid' | 'pro';

const WAITLIST_SUBJECT = 'TCG Pulse: Business waitlist';
const WAITLIST_BODY =
  "Hi,\n\nI'd like to join the waitlist for Business (API, data export, advanced alerts).\n\nThanks,\n";

/** Target inbox for the Business waitlist (mailto + copy + Gmail compose). */
export function businessWaitlistEmail(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUSINESS_WAITLIST_EMAIL) || SITE_CONTACT_EMAIL;
  return String(raw).trim() || SITE_CONTACT_EMAIL;
}

/** Opens the user's mail client to join the Business waitlist (no checkout). */
export function businessWaitlistMailto(): string {
  const email = businessWaitlistEmail();
  const subject = encodeURIComponent(WAITLIST_SUBJECT);
  const body = encodeURIComponent(WAITLIST_BODY);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/** Gmail in the browser when no desktop mail app is set (common on Windows). */
export function businessWaitlistGmailUrl(): string {
  const email = businessWaitlistEmail();
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(WAITLIST_SUBJECT)}&body=${encodeURIComponent(WAITLIST_BODY)}`;
}

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
    'Top 20 deal scores (score ≥ 55)',
    'Browse all sets + sealed prices',
    'Watchlist with price-drop alerts',
    'Card search across live EU listings',
    'Community support',
  ],
  paid: [
    'Unlimited deal scores (all deals, no cap)',
    'All filters: price, set, category, savings',
    'Full market stats & price history',
    'Email & Telegram price-drop alerts',
    'Priority support',
  ],
  pro: [
    'Everything in Plus today, same app access until extras launch',
    'Planned: read-only API & bulk data export',
    'Planned: advanced alert rules for shops',
    'Join the waitlist: we email you when Business checkout opens',
    'Built for shops and power users',
  ],
} as const;

/** CTA for free users upgrading to the first paid tier. */
export const CTA_SUBSCRIBE_PLUS = 'Subscribe to Plus';

/** Business is waitlist-only until API/export ships; opens email. */
export const CTA_BUSINESS_WAITLIST = 'Join Business waitlist';

/** @deprecated use CTA_BUSINESS_WAITLIST */
export const CTA_GET_BUSINESS = CTA_BUSINESS_WAITLIST;

/** @deprecated use CTA_BUSINESS_WAITLIST */
export const CTA_UPGRADE_BUSINESS = CTA_BUSINESS_WAITLIST;

/** Free-user upsell lines (replace vague “Premium”). */
export const UPSELL_SUBSCRIBE = 'Upgrade to Plus';
