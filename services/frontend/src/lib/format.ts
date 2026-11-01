/** Dutch number formatting for prices shown in the app ("€ 38,50"). */
const EUR = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

export function eur(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : EUR.format(value);
}

/** "€ 1.234,50" / "12,5" / "12.50" -> 1234.5; null when empty or not a positive number. */
export function parseEuro(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
  return cleaned !== '' && Number.isFinite(n) && n > 0 ? n : null;
}
