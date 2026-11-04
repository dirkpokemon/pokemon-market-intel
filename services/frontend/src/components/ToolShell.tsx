'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardTopBar } from '@/components/DashboardLayout';
import PublicHeader from '@/components/PublicHeader';
import Sidebar from '@/components/Sidebar';
import SiteFooter from '@/components/SiteFooter';
import { authApi } from '@/lib/api';
import { readSidebarCollapsed, writeSidebarCollapsed } from '@/lib/sidebar-prefs';
import { useLoggedIn } from '@/lib/useLoggedIn';

/**
 * Frame for the free tools (prijscheck, lijstprijs, graden, card pages).
 * Logged-in users get the dashboard sidebar, visitors the public header; the
 * server renders the public version (good for search).
 *
 * The page sits at the same place in the tree either way, so switching to the
 * sidebar after the session check doesn't remount it and lose what was typed.
 * An expired session falls back to the public header instead of forcing login.
 */
export default function ToolShell({ children }: { children: React.ReactNode }) {
  const loggedIn = useLoggedIn();
  const [user, setUser] = useState<any>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    setCollapsed(readSidebarCollapsed());
    try {
      setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      /* ignore */
    }
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      })
      .catch((e: unknown) => {
        if (cancelled || (e as { status?: number })?.status !== 401) return;
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setSignedOut(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const onCollapsedChange = useCallback((c: boolean) => {
    setCollapsed(c);
    writeSidebarCollapsed(c);
  }, []);

  const dashboard = Boolean(loggedIn && !signedOut);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {dashboard ? <Sidebar user={user} collapsed={collapsed} onCollapsedChange={onCollapsedChange} /> : <PublicHeader />}
      <div
        className={`flex flex-col flex-1 min-h-0 transition-all duration-200 ease-in-out ${
          dashboard ? (collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]') : ''
        }`}
      >
        {dashboard ? <DashboardTopBar /> : null}
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
