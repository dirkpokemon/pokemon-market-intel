'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Sidebar from './Sidebar';
import SiteFooter from './SiteFooter';
import TourBanner from './TourBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        /* ignore */
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.getMe();
        if (cancelled) return;
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number })?.status;
        if (status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-slate-600 border-t-gray-800 dark:border-t-gray-200 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
      <Sidebar user={user} />
      <div className="lg:ml-[240px] flex flex-col flex-1 min-h-0 transition-all duration-200">
        <TourBanner />
        <main className="flex-1 min-w-0">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
