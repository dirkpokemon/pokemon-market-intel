'use client';

/**
 * App mark: Pokéball on brand gradient — use in sidebar, landing, auth, and match favicon (app/icon.svg).
 */
export default function BrandMark({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const rounded = size >= 28 ? 'rounded-xl' : 'rounded-lg';
  const ballSize = Math.round(size * 0.58);
  return (
    <div
      className={`bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-black/10 ${rounded} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={ballSize}
        height={ballSize}
        viewBox="0 0 40 40"
        className="drop-shadow-sm"
        aria-hidden
      >
        <circle cx="20" cy="20" r="18" fill="#fafafa" />
        <path d="M20 2c9.94 0 18 8.06 18 18H2c0-9.94 8.06-18 18-18z" fill="#dc2626" />
        <rect x="2" y="19" width="36" height="2" fill="#111827" />
        <circle cx="20" cy="20" r="7" fill="#fff" stroke="#111827" strokeWidth="2" />
        <circle cx="20" cy="20" r="3" fill="#111827" />
      </svg>
    </div>
  );
}
