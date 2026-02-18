'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface MainNavProps {
  user: any;
}

export default function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Get display name: first name from full_name, or email prefix
  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'User';

  const navItems = [
    { href: '/home', label: 'Home', icon: '🏠', description: 'Overview' },
    { href: '/insights', label: 'Market Insights', icon: '📊', description: 'Analytics & Trends' },
    { href: '/deals', label: 'Top Deals', icon: '💎', description: 'Best Opportunities' },
    { href: '/signals', label: 'Signals', icon: '🎯', description: 'Priority Alerts', premium: true },
    { href: '/watchlist', label: 'Watchlist', icon: '⭐', description: 'Saved Items' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3 hover:opacity-80 transition">
            {/* Poké Ball Logo */}
            <div className="relative w-10 h-10 bg-white rounded-full border-[3px] border-gray-800 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 rounded-t-full" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 transform -translate-y-1/2 z-10" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-gray-800 z-20">
                <div className="absolute inset-0.5 bg-gray-100 rounded-full" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Pokémon Market Intel</h1>
              <p className="text-xs text-gray-500">EU Price Intelligence</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 relative group ${
                  pathname === item.href
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.premium && (
                  <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] rounded font-semibold">PRO</span>
                )}
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                  {item.description}
                </div>
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 transition border border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-tight">{displayName}</p>
                <p className="text-xs text-gray-500 leading-tight capitalize">{user?.role || 'free'}</p>
              </div>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {showSettings && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => setShowSettings(false)}
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                    </Link>
                    {user?.role === 'free' && (
                      <Link
                        href="/pricing"
                        className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-3"
                        onClick={() => setShowSettings(false)}
                      >
                        <span>⭐</span>
                        <span>Upgrade to Premium</span>
                      </Link>
                    )}
                  </div>

                  <div className="py-1 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="lg:hidden mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
