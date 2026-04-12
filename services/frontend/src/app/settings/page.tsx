'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileModal from '@/components/ProfileModal';
import { activateTour } from '@/lib/tour';
import { authApi, notificationApi, subscriptionApi } from '@/lib/api';
import { businessWaitlistMailto, CTA_BUSINESS_WAITLIST, tierLabel, UPSELL_SUBSCRIBE } from '@/lib/plans';

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
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
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
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account, notifications, and preferences</p>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-xs text-gray-500">{user?.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Account Type</p>
                <p className="text-xs text-gray-500">{tierLabel(user?.role)}</p>
              </div>
              {!isPaid && (
                <button onClick={() => router.push('/pricing')} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition font-medium">
                  {UPSELL_SUBSCRIBE}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">Profile Settings</p>
                <p className="text-xs text-gray-500">Update your profile information</p>
              </div>
              <button onClick={() => setShowProfile(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition font-medium">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {user?.role === 'paid' && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Business (coming soon)</h2>
            <p className="text-sm text-gray-600 mb-4">
              We are not selling Business yet — it will add API access, bulk export, and advanced alerts when ready. Join the
              waitlist and we will email you when checkout opens. You keep Plus until then.
            </p>
            <a
              href={businessWaitlistMailto()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              {CTA_BUSINESS_WAITLIST}
            </a>
            <p className="text-xs text-gray-500 mt-3">
              Same link as on the <span className="font-medium">Pricing</span> page under Business.
            </p>
          </div>
        )}

        {canManageStripeBilling && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Subscription &amp; billing</h2>
            <p className="text-sm text-gray-600 mb-4">
              Cancel your subscription, update your payment method, or download invoices through Stripe&apos;s secure portal.
              If you cancel, you keep access until the end of your current billing period; then your account returns to the free tier.
            </p>
            {billingError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {billingError}
              </div>
            )}
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {portalLoading && (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
              )}
              {portalLoading ? 'Opening…' : 'Manage subscription'}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              After changes in Stripe, refresh this page or sign out and back in so your plan updates here.
            </p>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Notifications</h2>
            {isPaid && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wide">
                {tierLabel(user?.role)}
              </span>
            )}
          </div>

          {!isPaid ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 mb-2">Notifications are included with Plus and Business.</p>
              <button onClick={() => router.push('/pricing')} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium">
                {UPSELL_SUBSCRIBE}
              </button>
            </div>
          ) : (
            <>
              {/* Delivery channels */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Delivery Channels</p>
              <div className="mb-6">
                <Toggle
                  checked={prefs.email_enabled}
                  onChange={(v) => updatePref('email_enabled', v)}
                  label="Email Notifications"
                  description="Receive high-priority signals and watchlist alerts via email"
                />
                {prefs.email_enabled && (
                  <div className="pl-0 py-2 pb-3 border-b border-gray-100">
                    <label className="block text-xs text-gray-500 mb-1">Email address</label>
                    <input
                      type="email"
                      value={prefs.email_address || user?.email || ''}
                      onChange={(e) => updatePref('email_address', e.target.value)}
                      placeholder={user?.email || 'your@email.com'}
                      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
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
                  <div className="pl-0 py-2 pb-3 border-b border-gray-100">
                    <label className="block text-xs text-gray-500 mb-1">Telegram Chat ID</label>
                    <input
                      type="text"
                      value={prefs.telegram_chat_id}
                      onChange={(e) => updatePref('telegram_chat_id', e.target.value)}
                      placeholder="123456789"
                      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Start a chat with <span className="font-mono">@PokemonIntelBot</span> and send /start to get your Chat ID.
                    </p>
                  </div>
                )}
              </div>

              {/* Signal types to notify about */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Signal Types</p>
              <div className="mb-6">
                <Toggle checked={prefs.notify_momentum} onChange={(v) => updatePref('notify_momentum', v)} label="Momentum" description="Price + volume both rising" />
                <Toggle checked={prefs.notify_risk} onChange={(v) => updatePref('notify_risk', v)} label="Risk Warnings" description="Possible bubble or manipulation" />
                <Toggle checked={prefs.notify_price_drop} onChange={(v) => updatePref('notify_price_drop', v)} label="Price Drops" description="Significant price decreases" />
                <Toggle checked={prefs.notify_supply} onChange={(v) => updatePref('notify_supply', v)} label="Supply Changes" description="Listing volume surges or drops" />
                <Toggle checked={prefs.notify_volatility} onChange={(v) => updatePref('notify_volatility', v)} label="Volatility Spikes" description="Unstable price action" />
                <Toggle checked={prefs.notify_set_trends} onChange={(v) => updatePref('notify_set_trends', v)} label="Set Trends" description="Entire sets moving up or down" />
              </div>

              {/* Watchlist alerts */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Portfolio</p>
              <div className="mb-6">
                <Toggle checked={prefs.notify_watchlist} onChange={(v) => updatePref('notify_watchlist', v)} label="Watchlist Price Targets" description="When a card in your watchlist hits its target price" />
              </div>

              {/* Priority filter */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Minimum Priority</p>
              <div className="mb-4">
                <div className="flex items-center gap-4 py-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={prefs.min_priority}
                    onChange={(e) => updatePref('min_priority', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-8 text-center">{prefs.min_priority}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Only send notifications for signals with priority {prefs.min_priority}+ (1 = everything, 10 = critical only)
                </p>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={savePrefs}
                  className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                >
                  Save Preferences
                </button>
                {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
              </div>
            </>
          )}
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Onboarding Tour</p>
                <p className="text-xs text-gray-500">Replay the platform walkthrough</p>
              </div>
              <button
                onClick={() => { activateTour(); router.push('/home'); }}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition font-medium"
              >
                Replay Tour
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Keyboard Shortcuts</p>
                <p className="text-xs text-gray-500">View available shortcuts</p>
              </div>
              <button
                onClick={() => alert('Keyboard Shortcuts:\n\nS - Focus search\nW - Toggle watchlist view\n? - Show shortcuts help\nESC - Close modals')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition font-medium"
              >
                View
              </button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Clear Cache</p>
                <p className="text-xs text-gray-500">Reset watchlist, portfolio, alerts, and preferences</p>
              </div>
              <button onClick={handleClearCache} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs rounded-lg hover:bg-red-100 transition font-medium">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">About</h2>
          <div className="space-y-2 text-xs text-gray-500">
            <p><strong className="text-gray-700">Version:</strong> 1.0.0</p>
            <p><strong className="text-gray-700">Platform:</strong> TCG Pulse — EU market intelligence for trading card singles</p>
            <p><strong className="text-gray-700">Support:</strong> support@pokemontel.eu</p>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={(data) => { console.log('Profile updated:', data); setShowProfile(false); }} />
      )}
    </DashboardLayout>
  );
}
