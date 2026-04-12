'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileModal from '@/components/ProfileModal';
import { activateTour } from '@/lib/tour';
import { authApi, notificationApi, subscriptionApi } from '@/lib/api';
import BusinessWaitlistActions from '@/components/BusinessWaitlistActions';
import ThemeToggle from '@/components/ThemeToggle';
import { tierLabel, UPSELL_SUBSCRIBE } from '@/lib/plans';

const NOTIF_PREFS_KEY = 'notification_preferences';

interface NotificationPrefs {
  email_enabled: boolean;
  email_address: string;
  telegram_enabled: boolean;
  telegram_chat_id: string;
  notify_momentum: boolean;
  notify_risk: boolean;
  notify_price_drop: boolean;
  notify_supply: boolean;
  notify_volatility: boolean;
  notify_set_trends: boolean;
  notify_watchlist: boolean;
  min_priority: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_enabled: false,
  email_address: '',
  telegram_enabled: false,
  telegram_chat_id: '',
  notify_momentum: true,
  notify_risk: true,
  notify_price_drop: true,
  notify_supply: false,
  notify_volatility: false,
  notify_set_trends: true,
  notify_watchlist: true,
  min_priority: 7,
};

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          checked
            ? 'border-emerald-600/80 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-600'
            : 'border-gray-300/80 bg-gray-200 dark:border-gray-500 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out dark:ring-white/15 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingError, setBillingError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const updatePref = (key: keyof NotificationPrefs, value: any) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
      return updated;
    });
    setSaved(false);
  };

  const savePrefs = async () => {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
    try {
      await notificationApi.updatePrefs({
        alerts_enabled: prefs.email_enabled || prefs.telegram_enabled,
        alert_email: prefs.email_enabled ? (prefs.email_address || user?.email) : undefined,
        telegram_chat_id: prefs.telegram_enabled ? prefs.telegram_chat_id : undefined,
      });
    } catch (err) {
      console.warn('Failed to sync notification prefs to backend:', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = () => {
    if (confirm('This will clear your watchlist, portfolio, and preferences. Continue?')) {
      localStorage.removeItem('watchlist');
      localStorage.removeItem('portfolio_collection');
      localStorage.removeItem('portfolio_watchlist');
      localStorage.removeItem('hasSeenOnboarding');
      localStorage.removeItem('price_alerts');
      localStorage.removeItem(NOTIF_PREFS_KEY);
      alert('Cache cleared!');
    }
  };

  const isPaid = user?.role === 'paid' || user?.role === 'pro' || user?.role === 'admin';
  const canManageStripeBilling = user?.role === 'paid' || user?.role === 'pro';

  const openBillingPortal = async () => {
    setBillingError('');
    setPortalLoading(true);
    try {
      const { portal_url } = await subscriptionApi.createPortalSession();
      window.location.href = portal_url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not open billing portal';
      setBillingError(msg);
      setPortalLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account, notifications, and preferences</p>
        </div>

        {/* Account */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'Onbekend'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Account Type</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tierLabel(user?.role)}</p>
              </div>
              {!isPaid && (
                <button
                  onClick={() => router.push('/pricing')}
                  className="shrink-0 px-3 py-1.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium"
                >
                  {UPSELL_SUBSCRIBE}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Profile Settings</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update your profile information</p>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent dark:border-gray-600 transition font-medium"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {user?.role === 'paid' && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/55 dark:to-violet-950/55 rounded-xl border border-indigo-100 dark:border-indigo-800/60 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
              Business (coming soon)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We are not selling Business yet. It will add API access, bulk export, and advanced alerts when ready. Join the
              waitlist and we will email you when checkout opens. You keep Plus until then.
            </p>
            <BusinessWaitlistActions variant="settings" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
              Same link as on the <span className="font-medium text-gray-700 dark:text-gray-300">Pricing</span> page under Business.
            </p>
          </div>
        )}

        {canManageStripeBilling && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-2">Subscription &amp; billing</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Cancel your subscription, update your payment method, or download invoices through Stripe&apos;s secure portal.
              If you cancel, you keep access until the end of your current billing period; then your account returns to the free tier.
            </p>
            {billingError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {billingError}
              </div>
            )}
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium rounded-lg border border-gray-900 dark:border-gray-200 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm dark:shadow-none"
            >
              {portalLoading && (
                <span
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin dark:border-gray-300 dark:border-t-gray-900"
                  aria-hidden
                />
              )}
              {portalLoading ? 'Opening…' : 'Manage subscription'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              After changes in Stripe, refresh this page or sign out and back in so your plan updates here.
            </p>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Notifications</h2>
            {isPaid && (
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 text-[10px] font-bold rounded uppercase tracking-wide">
                {tierLabel(user?.role)}
              </span>
            )}
          </div>

          {!isPaid ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Notifications are included with Plus and Business.</p>
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition font-medium shadow-sm"
              >
                {UPSELL_SUBSCRIBE}
              </button>
            </div>
          ) : (
            <>
              {/* Delivery channels */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Delivery Channels</p>
              <div className="mb-6">
                <Toggle
                  checked={prefs.email_enabled}
                  onChange={(v) => updatePref('email_enabled', v)}
                  label="Email Notifications"
                  description="Receive high-priority signals and watchlist alerts via email"
                />
                {prefs.email_enabled && (
                  <div className="pl-0 py-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email address</label>
                    <input
                      type="email"
                      value={prefs.email_address || user?.email || ''}
                      onChange={(e) => updatePref('email_address', e.target.value)}
                      placeholder={user?.email || 'your@email.com'}
                      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40 focus:border-indigo-500 dark:focus:border-indigo-500"
                    />
                  </div>
                )}
                <Toggle
                  checked={prefs.telegram_enabled}
                  onChange={(v) => updatePref('telegram_enabled', v)}
                  label="Telegram Notifications"
                  description="Instant alerts via Telegram bot"
                />
                {prefs.telegram_enabled && (
                  <div className="pl-0 py-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telegram Chat ID</label>
                    <input
                      type="text"
                      value={prefs.telegram_chat_id}
                      onChange={(e) => updatePref('telegram_chat_id', e.target.value)}
                      placeholder="123456789"
                      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40 focus:border-indigo-500 dark:focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      Start a chat with <span className="font-mono">@PokemonIntelBot</span> and send /start to get your Chat ID.
                    </p>
                  </div>
                )}
              </div>

              {/* Signal types to notify about */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Signal Types</p>
              <div className="mb-6">
                <Toggle checked={prefs.notify_momentum} onChange={(v) => updatePref('notify_momentum', v)} label="Momentum" description="Price + volume both rising" />
                <Toggle checked={prefs.notify_risk} onChange={(v) => updatePref('notify_risk', v)} label="Risk Warnings" description="Possible bubble or manipulation" />
                <Toggle checked={prefs.notify_price_drop} onChange={(v) => updatePref('notify_price_drop', v)} label="Price Drops" description="Significant price decreases" />
                <Toggle checked={prefs.notify_supply} onChange={(v) => updatePref('notify_supply', v)} label="Supply Changes" description="Listing volume surges or drops" />
                <Toggle checked={prefs.notify_volatility} onChange={(v) => updatePref('notify_volatility', v)} label="Volatility Spikes" description="Unstable price action" />
                <Toggle checked={prefs.notify_set_trends} onChange={(v) => updatePref('notify_set_trends', v)} label="Set Trends" description="Entire sets moving up or down" />
              </div>

              {/* Watchlist alerts */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Portfolio</p>
              <div className="mb-6">
                <Toggle checked={prefs.notify_watchlist} onChange={(v) => updatePref('notify_watchlist', v)} label="Watchlist Price Targets" description="When a card in your watchlist hits its target price" />
              </div>

              {/* Priority filter */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Minimum Priority</p>
              <div className="mb-4">
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Drempel (1 = alles, 10 = alleen kritiek)</span>
                    <span className="text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-300 min-w-[1.5rem] text-right">
                      {prefs.min_priority}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={prefs.min_priority}
                    onChange={(e) => updatePref('min_priority', parseInt(e.target.value, 10))}
                    className="app-range-input block"
                    aria-valuemin={1}
                    aria-valuemax={10}
                    aria-valuenow={prefs.min_priority}
                    aria-label="Minimum signaal-prioriteit"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Alleen meldingen met prioriteit {prefs.min_priority}+ (1 = alles, 10 = alleen kritiek)
                </p>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={savePrefs}
                  className="px-5 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                >
                  Save Preferences
                </button>
                {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved!</span>}
              </div>
            </>
          )}
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Appearance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Light or dark interface. Saved on this device.</p>
              </div>
              <div className="sm:w-56">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Onboarding Tour</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Replay the platform walkthrough</p>
              </div>
              <button
                onClick={() => { activateTour(); router.push('/home'); }}
                className="shrink-0 px-3 py-1.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium"
              >
                Replay Tour
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Keyboard Shortcuts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">View available shortcuts</p>
              </div>
              <button
                onClick={() => alert('Keyboard Shortcuts:\n\nS - Focus search\nW - Toggle watchlist view\n? - Show shortcuts help\nESC - Close modals')}
                className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent dark:border-gray-600 transition font-medium"
              >
                View
              </button>
            </div>
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Clear Cache</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reset watchlist, portfolio, alerts, and preferences</p>
              </div>
              <button
                onClick={handleClearCache}
                className="shrink-0 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-100 dark:border-red-900/50 transition font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">About</h2>
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <p><strong className="text-gray-700 dark:text-gray-300">Version:</strong> 1.0.0</p>
            <p><strong className="text-gray-700 dark:text-gray-300">Platform:</strong> TCG Pulse, EU market intelligence for trading card singles</p>
            <p><strong className="text-gray-700 dark:text-gray-300">Support:</strong> support@pokemontel.eu</p>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={(data) => { console.log('Profile updated:', data); setShowProfile(false); }} />
      )}
    </DashboardLayout>
  );
}
