'use client';

import { useCallback, useEffect, useState } from 'react';
import { applyTheme, type ThemeMode } from '@/lib/theme';

function readMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Icon-only control for marketing headers (login, pricing, landing). */
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
      className={`p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
    >
      <span className="text-base leading-none" aria-hidden>
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
}

export default function ThemeToggle({
  collapsed,
  className = '',
}: {
  /** Sidebar: icon only when collapsed */
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white ${collapsed ? 'justify-center' : ''} ${className}`}
      aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      aria-pressed={isDark}
    >
      <span className="flex-shrink-0 text-lg leading-none" aria-hidden>
        {isDark ? '☀️' : '🌙'}
      </span>
      {!collapsed && <span className="truncate">{isDark ? 'Licht thema' : 'Donker thema'}</span>}
    </button>
  );
}
