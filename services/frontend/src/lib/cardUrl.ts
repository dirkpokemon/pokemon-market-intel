/**
 * Public card page URLs: /kaart/charizard-ex-obsidian-flames-199-123456 for the
 * English card, ...-123456-jp for another language. The trailing number is the
 * CardTrader blueprint id (card_number); the words before it are for people and
 * search engines only, so a renamed card keeps working (the page redirects to
 * the current spelling).
 */
import { CARD_LANGUAGES } from '@/lib/languages';

export interface CardKey {
  product_name: string;
  product_set?: string | null;
  collector_number?: string | null;
  card_number: string;
  language?: string | null;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function cardSlug(c: CardKey): string {
  const words = [c.product_name, c.product_set, c.collector_number?.split('/')[0]].filter(Boolean).join(' ');
  const lang = c.language && c.language !== 'EN' ? `-${c.language.toLowerCase()}` : '';
  return `${slugify(words) || 'kaart'}-${c.card_number}${lang}`;
}

export function cardPath(c: CardKey): string {
  return `/kaart/${cardSlug(c)}`;
}

/** { card_number, language } from a slug, or null when it doesn't end in an id. */
export function parseCardSlug(slug: string): { card_number: string; language: string } | null {
  const parts = slug.toLowerCase().split('-');
  let language = 'EN';
  const last = parts[parts.length - 1];
  if (CARD_LANGUAGES.some((l) => l.code !== 'EN' && l.code.toLowerCase() === last)) {
    language = last.toUpperCase();
    parts.pop();
  }
  const id = parts[parts.length - 1];
  return id && /^\d+$/.test(id) ? { card_number: id, language } : null;
}
