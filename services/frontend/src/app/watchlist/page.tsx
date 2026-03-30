'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old /watchlist URL to new /portfolio page
export default function WatchlistRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portfolio');
  }, [router]);
  return null;
}
