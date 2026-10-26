/** Small label for Japanese prints (English is the default and gets no label). */
export default function LanguageBadge({ language, className = '' }: { language?: string | null; className?: string }) {
  if (!language || language === 'EN') return null;
  const label = language === 'JP' ? 'Japans' : language;
  return (
    <span
      title={language === 'JP' ? 'Japanse uitgave: eigen prijzen, los van de Engelse kaart' : undefined}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 ${className}`}
    >
      🇯🇵 {label}
    </span>
  );
}
