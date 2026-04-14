'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface CardImageProps {
  cardName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const imageCache: Record<string, string | null> = {};
const tcgInflight = new Map<string, Promise<string | null>>();
const LS_PREFIX = 'card_img_v2_';

function normalizeListingTitle(name: string): string {
  return name
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/\s*\((?:NM|LP|MP|HP|DMG|Near Mint|Lightly Played|Moderately Played)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCardName(name: string): string {
  const base = normalizeListingTitle(name);
  return base
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(
      /\s*(ex|EX|V|VMAX|VSTAR|GX|Tag Team|Radiant|Full Art|Alt Art|Illustration Rare|Special Illustration Rare|Ultra Rare|Hyper Rare)\s*/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function buildQueryAttempts(cardName: string): string[] {
  const raw = normalizeListingTitle(cardName);
  const cleaned = cleanCardName(cardName);
  const beforeDelimiter = raw.split(/\s*[-–|]\s*/)[0]?.trim() || raw;
  const beforeCleaned = cleanCardName(beforeDelimiter);
  const attempts: string[] = [];
  const add = (q: string) => {
    if (q && !attempts.includes(q)) attempts.push(q);
  };
  if (cleaned.length >= 2) add(`name:"${cleaned}"`);
  if (beforeCleaned.length >= 2 && beforeCleaned !== cleaned) add(`name:"${beforeCleaned}"`);
  const words = beforeCleaned.split(/\s+/).filter((w) => w.length > 1);
  if (words.length >= 1) {
    const slice = words.slice(0, Math.min(4, words.length)).join(' ');
    if (slice.length >= 3) add(`name:${slice}`);
  }
  if (words[0] && words[0].length >= 4) add(`name:${words[0]}`);
  return attempts;
}

function cacheKeyFor(name: string): string {
  return normalizeListingTitle(name).toLowerCase();
}

function getCachedImage(key: string): string | null {
  try {
    const cached = localStorage.getItem(`${LS_PREFIX}${key}`);
    if (cached) {
      const { url, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        return url;
      }
    }
  } catch {}
  return null;
}

function setCachedImage(key: string, url: string | null) {
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify({ url, timestamp: Date.now() }));
  } catch {}
}

async function fetchPokemonTcgImage(cardName: string): Promise<string | null> {
  const queries = buildQueryAttempts(cardName);
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1&select=id,name,images`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const url = data.data?.[0]?.images?.small;
      if (url) return url as string;
    } catch {
      /* try next query */
    }
  }
  return null;
}

function fetchPokemonTcgImageDeduped(cardName: string): Promise<string | null> {
  const key = cacheKeyFor(cardName);
  const hit = tcgInflight.get(key);
  if (hit) return hit;
  const p = fetchPokemonTcgImage(cardName).finally(() => tcgInflight.delete(key));
  tcgInflight.set(key, p);
  return p;
}

export default function CardImage({ cardName, size = 'sm', className = '' }: CardImageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-12 h-16',
    md: 'w-16 h-22',
    lg: 'w-24 h-32',
  };

  const sizePx: Record<NonNullable<CardImageProps['size']>, { w: number; h: number }> = {
    xs: { w: 32, h: 44 },
    sm: { w: 48, h: 64 },
    md: { w: 64, h: 88 },
    lg: { w: 96, h: 128 },
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '160px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const key = cacheKeyFor(cardName);

    const run = async () => {
      if (imageCache[key] !== undefined) {
        setImageUrl(imageCache[key]);
        setLoading(false);
        return;
      }

      const cached = getCachedImage(key);
      if (cached !== null) {
        imageCache[key] = cached;
        setImageUrl(cached || null);
        setLoading(false);
        return;
      }

      const url = await fetchPokemonTcgImageDeduped(cardName);
      imageCache[key] = url;
      setCachedImage(key, url ?? '');
      setImageUrl(url);
      setLoading(false);
    };

    if (!cardName?.trim()) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    run();
  }, [cardName, visible]);

  return (
    <div
      ref={rootRef}
      className={`${sizeClasses[size]} rounded-lg overflow-hidden flex-shrink-0 ${className}`}
    >
      {loading ? (
        <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg" />
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={cardName}
          width={sizePx[size].w}
          height={sizePx[size].h}
          unoptimized
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 rounded-lg flex items-center justify-center border border-gray-200">
          <span className="text-lg" title="No TCG image found">
            🃏
          </span>
        </div>
      )}
    </div>
  );
}
