'use client';

import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import ThemeToggle from '@/components/ThemeToggle';
import { SUBSCRIBER_BADGE, tierLabel } from '@/lib/plans';
import { feedbackApi } from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'idea' | 'bug' | 'other'>('idea');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackEmailSent, setFeedbackEmailSent] = useState<boolean | null>(null);

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'User';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const baseNavItems = [
    { href: '/home', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { href: '/insights', label: 'Market Pulse', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    )},
    { href: '/deals', label: 'Top Deals', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { href: '/signals', label: 'Signals', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    ), premium: true },
    { href: '/portfolio', label: 'Portfolio', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
  ];

  const navItems =
    user?.role === 'admin'
      ? [
          ...baseNavItems,
          {
            href: '/admin',
            label: 'Admin',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
        ]
      : baseNavItems;

  const bottomItems = [
    { href: '/settings', label: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
  ];

  const NavLink = ({ item, compact = false }: { item: typeof navItems[0] & { premium?: boolean }, compact?: boolean }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={compact ? item.label : undefined}
        className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all relative group max-w-full ${
          isActive
            ? 'bg-gray-900 text-white dark:bg-indigo-600 dark:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
        } ${compact ? 'justify-center' : ''}`}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {!compact && (
          <>
            <span className="truncate">{item.label}</span>
            {item.premium && (
              <span className="ml-auto px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded font-semibold">{SUBSCRIBER_BADGE}</span>
            )}
          </>
        )}
        {compact && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 shadow-lg max-md:hidden">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 flex flex-col
        transition-all duration-200 ease-in-out overflow-x-hidden
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`flex items-center h-16 border-b border-gray-100 dark:border-gray-800 min-w-0 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          <BrandMark size={32} className="flex-shrink-0 max-w-full" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">TCG Pulse</p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium leading-tight">
                EU trading card market data
              </p>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 min-h-0 min-w-0 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} compact={collapsed} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-3 space-y-1 min-w-0 overflow-x-hidden shrink-0">
          <ThemeToggle collapsed={collapsed} />
          <button
            type="button"
            title={collapsed ? 'Feedback' : undefined}
            onClick={() => {
              setShowFeedback(true);
              setFeedbackSent(false);
              setFeedbackText('');
              setFeedbackError('');
              setFeedbackEmailSent(null);
            }}
            className={`relative group flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all w-full max-w-full min-w-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </span>
            {!collapsed && <span className="truncate">Feedback</span>}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 shadow-lg max-md:hidden">
                Feedback
              </div>
            )}
          </button>

          {bottomItems.map((item) => (
            <NavLink key={item.href} item={item} compact={collapsed} />
          ))}
          
          {/* User profile */}
          <div className={`flex items-center min-w-0 max-w-full py-2.5 rounded-lg ${collapsed ? 'justify-center gap-2 px-2' : 'gap-3 px-3'}`}>
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{tierLabel(user?.role)}</p>
              </div>
            )}
            {!collapsed && (
              <button 
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition"
                title="Logout"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button 
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-gray-100 dark:border-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition"
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowFeedback(false)}>
          <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {feedbackSent ? (
              /* Success state */
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Thanks for your feedback!</h3>
                {feedbackEmailSent === true && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    A copy was emailed to the team inbox. Check spam if you manage that mailbox. We may follow up via your account email if needed.
                  </p>
                )}
                {feedbackEmailSent === false && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-left space-y-2">
                    <p>Your message was saved on the server, but <strong>no email was sent</strong> to the feedback inbox.</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      On Railway, open the <strong>backend</strong> service logs right after sending — look for &quot;Brevo HTTP&quot; errors or &quot;Feedback email NOT delivered&quot;.
                      Usually you need <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">BREVO_API_KEY</code> plus a <strong>verified sender</strong> in Brevo (same as signup verification mail), or working SMTP variables.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="px-5 py-2 bg-gray-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-indigo-500 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Feedback form */
              <>
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send Feedback</h3>
                    <button type="button" onClick={() => setShowFeedback(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Help us improve TCG Pulse</p>
                </div>

                <div className="px-6 pb-6">
                  {/* Type selector */}
                  <div className="flex gap-2 mb-4">
                    {([
                      { value: 'idea' as const, label: '💡 Idea', color: 'blue' },
                      { value: 'bug' as const, label: '🐛 Bug', color: 'red' },
                      { value: 'other' as const, label: '💬 Other', color: 'gray' },
                    ]).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFeedbackType(t.value)}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition border ${
                          feedbackType === t.value
                            ? 'bg-gray-900 dark:bg-indigo-600 text-white border-gray-900 dark:border-indigo-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === 'idea' ? 'I would love it if...' :
                      feedbackType === 'bug' ? 'I found an issue with...' :
                      'Tell us what you think...'
                    }
                    className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/30 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition"
                    autoFocus
                  />

                  {/* Submit */}
                  <div className="mt-4 space-y-2">
                    {feedbackError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{feedbackError}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-400">
                        {user?.email ? `Logged in as ${user.email}` : 'Sign in required to send feedback'}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!feedbackText.trim() || feedbackSubmitting) return;
                          setFeedbackError('');
                          setFeedbackSubmitting(true);
                          try {
                            const res = await feedbackApi.submit({
                              type: feedbackType,
                              message: feedbackText.trim(),
                            });
                            setFeedbackEmailSent(res.email_sent);
                            setFeedbackSent(true);
                            setFeedbackText('');
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Could not send feedback. Try again later.';
                            setFeedbackError(msg);
                          } finally {
                            setFeedbackSubmitting(false);
                          }
                        }}
                        disabled={!feedbackText.trim() || feedbackSubmitting}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                          feedbackText.trim() && !feedbackSubmitting
                            ? 'bg-gray-900 dark:bg-indigo-600 text-white hover:bg-gray-800 dark:hover:bg-indigo-500'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {feedbackSubmitting ? 'Sending…' : 'Send Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
