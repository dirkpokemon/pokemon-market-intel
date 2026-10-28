/**
 * Subscription tiers: internal roles stay `paid` | `pro` (API/DB).
 * Display names: Plus / Business.
 * Business: waitlist only until API/export ships (mailto flow).
 */

import { SITE_CONTACT_EMAIL } from './site';

export type AppTier = 'free' | 'paid' | 'pro';

const WAITLIST_SUBJECT = 'TCG Pulse: wachtlijst Business';
const WAITLIST_BODY =
  'Hallo,\n\nIk wil graag op de wachtlijst voor Business (API, data-export, uitgebreide alerts).\n\nGroet,\n';

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
  free: 'Gratis',
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

/** Plus price as shown on the site; keep in sync with the Stripe price (STRIPE_PRICE_ID_PAID). */
export const PLUS_PRICE = '€6';

export const PLAN_FEATURES = {
  free: [
    'Top 20 dealscores (score ≥ 55)',
    'Prijscheck en lijstprijs tot 10 kaarten',
    'Alle sets en sealed prijzen bekijken',
    'Watchlist met e-mailalerts bij prijsdalingen',
    'Zoeken in het actuele EU-aanbod',
  ],
  paid: [
    'Alle dealscores, zonder limiet',
    'Alle filters: prijs, set, categorie, besparing',
    'Volledige marktstatistieken en prijsgeschiedenis',
    'Lijstprijs voor lijsten tot 60 kaarten',
    'Voorrang bij support',
  ],
  pro: [
    'Nu: alles van Plus, tot de extra functies klaar zijn',
    'Gepland: API (alleen lezen) en data-export',
    'Gepland: uitgebreide alertregels voor winkels',
    'Zet je op de wachtlijst: we mailen je zodra Business beschikbaar is',
    'Gemaakt voor winkels en intensieve gebruikers',
  ],
} as const;

/** CTA for free users upgrading to the first paid tier. */
export const CTA_SUBSCRIBE_PLUS = 'Neem Plus';

/** Business is waitlist-only until API/export ships; opens email. */
export const CTA_BUSINESS_WAITLIST = 'Op de wachtlijst voor Business';

/** @deprecated use CTA_BUSINESS_WAITLIST */
export const CTA_GET_BUSINESS = CTA_BUSINESS_WAITLIST;

/** @deprecated use CTA_BUSINESS_WAITLIST */
export const CTA_UPGRADE_BUSINESS = CTA_BUSINESS_WAITLIST;

/** Free-user upsell lines (replace vague “Premium”). */
export const UPSELL_SUBSCRIBE = 'Upgrade naar Plus';
