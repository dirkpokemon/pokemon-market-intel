'use client';

/**
 * CardImage — a copyright-safe, self-rendered card tile.
 *
 * We deliberately do NOT fetch or display Pokémon card artwork: that art is
 * © The Pokémon Company and we have no licence to reproduce it. Instead we
 * render an original, branded placeholder derived only from the card name
 * (initials + name), with a deterministic colour so each card looks distinct
 * and stable. No external image requests, no third-party IP.
 */

interface CardImageProps {
  cardName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Tasteful gradient pairs (Tailwind from/to). Chosen deterministically per card.
const GRADIENTS = [
  'from-indigo-500 to-violet-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-fuchsia-500 to-purple-700',
  'from-cyan-500 to-sky-700',
  'from-lime-500 to-green-700',
  'from-red-500 to-rose-700',
  'from-blue-500 to-indigo-700',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function cleanName(name: string): string {
  return name
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/\s*\((?:NM|LP|MP|HP|DMG|Near Mint|Lightly Played|Moderately Played)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function initials(name: string): string {
  const words = cleanName(name).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function CardImage({ cardName, size = 'sm', className = '' }: CardImageProps) {
  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-12 h-16',
    md: 'w-16 h-22',
    lg: 'w-24 h-32',
    xl: 'w-full h-full aspect-[5/7]',
  };

  const name = cleanName(cardName || '');
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  const showName = size === 'lg' || size === 'xl';
  const initialsSize = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : size === 'xs' ? 'text-[10px]' : 'text-sm';

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg overflow-hidden flex-shrink-0 relative bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-center px-1 ${className}`}
      role="img"
      aria-label={name || 'Card'}
      title={name || undefined}
    >
      {/* subtle top sheen for a card-like feel */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/10" />
      <span className={`relative font-black text-white/90 leading-none tracking-tight select-none ${initialsSize}`}>
        {initials(name)}
      </span>
      {showName && (
        <span className="relative mt-1.5 text-[10px] leading-tight text-white/80 font-medium line-clamp-2 select-none px-1">
          {name}
        </span>
      )}
    </div>
  );
}
