/** Dutch number formatting for prices shown in the app ("€ 38,50"). */
const EUR = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

export function eur(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : EUR.format(value);
}
