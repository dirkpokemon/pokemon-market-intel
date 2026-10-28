'use client';

import { useEffect, useState } from 'react';

/** null until mounted (localStorage isn't available during server rendering). */
export function useLoggedIn(): boolean | null {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setLoggedIn(!!localStorage.getItem('access_token'));
    } catch {
      setLoggedIn(false);
    }
  }, []);
  return loggedIn;
}
