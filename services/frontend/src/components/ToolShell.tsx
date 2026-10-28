'use client';

import { useCallback, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import { useLoggedIn } from '@/lib/useLoggedIn';

/**
 * Frame for the free tools (prijscheck, lijstprijs). Logged-in users keep the
 * dashboard sidebar, so they never lose their way back; visitors get the
 * public header. The server renders the public version (good for search).
 */
export default function ToolShell({ children }: { children: React.ReactNode }) {
  const loggedIn = useLoggedIn();
  const [signedOut, setSignedOut] = useState(false);
  const onSignedOut = useCallback(() => setSignedOut(true), []);
  if (loggedIn && !signedOut) return <DashboardLayout onSignedOut={onSignedOut}>{children}</DashboardLayout>;
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PublicHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
