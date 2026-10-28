/**
 * Card languages with their own prices (keep in sync with SUPPORTED_LANGUAGES
 * in backend app/core/language.py). English is the default and gets no badge.
 */
export type CardLanguage = 'EN' | 'JP' | 'IT';

export const CARD_LANGUAGES: { code: CardLanguage; label: string; plural: string; flag: string }[] = [
  { code: 'EN', label: 'Engels', plural: 'Engelse kaarten', flag: '🇬🇧' },
  { code: 'JP', label: 'Japans', plural: 'Japanse kaarten', flag: '🇯🇵' },
  { code: 'IT', label: 'Italiaans', plural: 'Italiaanse kaarten', flag: '🇮🇹' },
];

export function languageInfo(code?: string | null) {
  return CARD_LANGUAGES.find((l) => l.code === code);
}
