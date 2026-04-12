export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function resolveInitialTheme(): ThemeMode {
  const stored = typeof window !== 'undefined' ? getStoredTheme() : null;
  if (stored) return stored;
  return getSystemDark() ? 'dark' : 'light';
}
