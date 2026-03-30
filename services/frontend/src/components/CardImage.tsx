'use client';

import { useState, useEffect } from 'react';

interface CardImageProps {
  cardName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Cache for card image URLs (avoids repeated API calls)
const imageCache: Record<string, string | null> = {};

// Clean card name for better API matching
function cleanCardName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical info like "(Special Illustration Rare)"
    .replace(/\s*(ex|EX|V|VMAX|VSTAR|GX|Tag Team|Radiant|Full Art|Alt Art)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get cached image URL from localStorage
function getCachedImage(key: string): string | null {
  try {
    const cached = localStorage.getItem(`card_img_${key}`);
    if (cached) {
      const { url, timestamp } = JSON.parse(cached);
      // Cache for 7 days
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        return url;
      }
    }
  } catch {}
  return null;
}

// Save image URL to localStorage cache
function setCachedImage(key: string, url: string | null) {
  try {
    localStorage.setItem(`card_img_${key}`, JSON.stringify({ url, timestamp: Date.now() }));
  } catch {}
}

export default function CardImage({ cardName, size = 'sm', className = '' }: CardImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-12 h-16',
    md: 'w-16 h-22',
    lg: 'w-24 h-32',
  };

  useEffect(() => {
    const fetchCardImage = async () => {
      const cacheKey = cleanCardName(cardName).toLowerCase();

      // Check memory cache first
      if (imageCache[cacheKey] !== undefined) {
        setImageUrl(imageCache[cacheKey]);
        setLoading(false);
        return;
      }

      // Check localStorage cache
      const cached = getCachedImage(cacheKey);
      if (cached !== null) {
        imageCache[cacheKey] = cached;
        setImageUrl(cached);
        setLoading(false);
        return;
      }

      try {
        const searchName = cleanCardName(cardName);
        const res = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(searchName)}"&pageSize=1&select=id,name,images`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const url = data.data[0].images.small;
            imageCache[cacheKey] = url;
            setCachedImage(cacheKey, url);
            setImageUrl(url);
          } else {
            imageCache[cacheKey] = null;
            setCachedImage(cacheKey, '');
          }
        }
      } catch {
        imageCache[cacheKey] = null;
      }
      setLoading(false);
    };

    fetchCardImage();
  }, [cardName]);

  return (
    <div className={`${sizeClasses[size]} rounded-lg overflow-hidden flex-shrink-0 ${className}`}>
      {loading ? (
        /* Shimmer loading placeholder */
        <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg" />
      ) : imageUrl ? (
        /* Real card image */
        <img
          src={imageUrl}
          alt={cardName}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
      ) : (
        /* Fallback: nice gradient placeholder */
        <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 rounded-lg flex items-center justify-center border border-gray-200">
          <span className="text-lg">🃏</span>
        </div>
      )}
    </div>
  );
}
