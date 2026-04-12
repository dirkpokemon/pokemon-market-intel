'use client';

import { useCallback, useEffect, useState } from 'react';
import { applyTheme, type ThemeMode } from '@/lib/theme';

function readMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Minimal icon control for marketing headers (landing, pricing). */
export function ThemeIconButton({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    setMode(readMode());
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = readMode() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setMode(next);
  }, []);

  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${className}`}
      aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      aria-pressed={isDark}
    >
      {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  );
}

export default function ThemeToggle({
  collapsed,
  className = '',
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    setMode(readMode());
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = readMode() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setMode(next);
  }, []);

  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors w-full ${collapsed ? 'justify-center px-1.5' : ''} ${className}`}
      aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      aria-pressed={isDark}
    >
      <span className="flex-shrink-0 opacity-80" aria-hidden>
        {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      </span>
      {!collapsed && <span className="truncate">{isDark ? 'Licht' : 'Donker'}</span>}
    </button>
  );
}
