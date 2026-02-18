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

  const navItems = [
    { href: '/home', label: 'Home', icon: '🏠', description: 'Overview' },
    { href: '/insights', label: 'Market Insights', icon: '📊', description: 'Analytics & Trends' },
    { href: '/deals', label: 'Top Deals', icon: '💎', description: 'Best Opportunities' },
    { href: '/signals', label: 'Signals', icon: '🎯', description: 'Priority Alerts', premium: true },
    { href: '/watchlist', label: 'Watchlist', icon: '⭐', description: 'Saved Items' },
  ];

  return (
    <header className="bg-gradient-to-r from-red-500 via-white to-blue-500 shadow-lg border-b-4 border-yellow-400 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3 hover:opacity-80 transition">
            {/* Poké Ball Logo */}
            <div className="relative w-12 h-12 bg-white rounded-full border-4 border-black shadow-lg flex items-center justify-center" style={{
              boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)'
            }}>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-600 rounded-t-full" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black transform -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-black z-10">
                <div className="absolute inset-0.5 bg-gray-200 rounded-full" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pokémon Market Intel</h1>
              <p className="text-xs text-gray-600 font-medium">EU Price Intelligence</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 relative group ${
                  pathname === item.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {item.premium && (
                  <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded font-bold">PRO</span>
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
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white rounded-lg shadow-md hover:shadow-lg transition border-2 border-gray-300"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold border-2 border-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-tight">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-gray-600 leading-tight font-semibold">{user?.role?.toUpperCase() || 'FREE'}</p>
              </div>
              <span className="text-gray-400">▼</span>
            </button>

            {showSettings && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-40">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {user?.role === 'paid' || user?.role === 'pro' ? 'Premium Account' : 'Free Account'}
                    </p>
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
                        className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-3"
                        onClick={() => setShowSettings(false)}
                      >
                        <span>⭐</span>
                        <span>Upgrade to Premium</span>
                      </Link>
                    )}
                  </div>

                  <div className="py-1 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
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
        <nav className="lg:hidden mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
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
