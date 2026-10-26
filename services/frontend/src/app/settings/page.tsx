'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileModal from '@/components/ProfileModal';
import { activateTour } from '@/lib/tour';
import { authApi, notificationApi, subscriptionApi, BackendNotifPrefs } from '@/lib/api';
import BusinessWaitlistActions from '@/components/BusinessWaitlistActions';
import ThemeToggle from '@/components/ThemeToggle';
import { tierLabel, UPSELL_SUBSCRIBE } from '@/lib/plans';

const NOTIF_PREFS_KEY = 'notification_preferences';

interface NotificationPrefs {
  email_enabled: boolean;
  email_address: string;
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

  // Backend notification preferences
  const [backendPrefs, setBackendPrefs] = useState<BackendNotifPrefs | null>(null);
  const [digestSaving, setDigestSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}

    // Load backend notification prefs
    notificationApi.getNotifPrefs()
      .then(p => setBackendPrefs(p))
      .catch(() => {});
  }, []);

  const toggleDigest = async (enabled: boolean) => {
    setDigestSaving(true);
    try {
      const updated = await notificationApi.patchNotifPrefs({ email_digest_enabled: enabled });
      setBackendPrefs(updated);
    } catch {
      // ignore
    } finally {
      setDigestSaving(false);
    }
  };

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
        alerts_enabled: prefs.email_enabled,
        alert_email: prefs.email_enabled ? (prefs.email_address || user?.email) : undefined,
      });
    } catch (err) {
      console.warn('Failed to sync notification prefs to backend:', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = () => {
    if (confirm('Dit wist je lokaal opgeslagen watchlist, portfolio en voorkeuren op dit apparaat. Doorgaan?')) {
      localStorage.removeItem('watchlist');
      localStorage.removeItem('portfolio_collection');
      localStorage.removeItem('portfolio_watchlist');
      localStorage.removeItem('hasSeenOnboarding');
      localStorage.removeItem('price_alerts');
      localStorage.removeItem(NOTIF_PREFS_KEY);
      alert('Lokale gegevens gewist.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Vul je wachtwoord in om te bevestigen.');
      return;
    }
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      localStorage.clear();
      router.push('/register');
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Verwijderen mislukt.');
      setDeleting(false);
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
      const msg = e instanceof Error ? e.message : 'Het betaalportaal kon niet worden geopend';
      setBillingError(msg);
      setPortalLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instellingen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Beheer je account, meldingen en voorkeuren</p>
        </div>

        {/* Account */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">E-mail</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'Onbekend'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Abonnement</p>
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
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Profiel</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pas je profielgegevens aan</p>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent dark:border-gray-600 transition font-medium"
              >
                Profiel bewerken
              </button>
            </div>
          </div>
        </div>

        {user?.role === 'paid' && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/55 dark:to-violet-950/55 rounded-xl border border-indigo-100 dark:border-indigo-800/60 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
              Business (binnenkort)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Business is nog niet te koop. Het voegt straks API-toegang, data-export en uitgebreide alerts toe. Zet je op de
              wachtlijst, dan mailen we je zodra het beschikbaar is. Tot die tijd houd je gewoon Plus.
            </p>
            <BusinessWaitlistActions variant="settings" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
              Dezelfde link als op de pagina <span className="font-medium text-gray-700 dark:text-gray-300">Abonnementen</span> onder Business.
            </p>
          </div>
        )}

        {canManageStripeBilling && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-2">Abonnement en betaling</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Zeg je abonnement op, wijzig je betaalmethode of download facturen via het beveiligde portaal van Stripe. Zeg je op,
              dan houd je toegang tot het einde van de lopende periode; daarna ga je terug naar Gratis.
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
              {portalLoading ? 'Openen…' : 'Abonnement beheren'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              Heb je iets gewijzigd in Stripe? Vernieuw deze pagina of log opnieuw in om je abonnement hier bij te werken.
            </p>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Meldingen</h2>
            {isPaid && (
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 text-[10px] font-bold rounded uppercase tracking-wide">
                {tierLabel(user?.role)}
              </span>
            )}
          </div>

          {/* Watchlist alerts are part of every plan, so everyone can manage (and turn off) their mail */}
          <>
              {/* Delivery channels */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Kanalen</p>
              <div className="mb-6">
                <Toggle
                  checked={prefs.email_enabled}
                  onChange={(v) => updatePref('email_enabled', v)}
                  label="Meldingen per e-mail"
                  description="Ontvang watchlist-alerts per e-mail"
                />
                {prefs.email_enabled && (
                  <div className="pl-0 py-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">E-mailadres</label>
                    <input
                      type="email"
                      value={prefs.email_address || user?.email || ''}
                      onChange={(e) => updatePref('email_address', e.target.value)}
                      placeholder={user?.email || 'jij@voorbeeld.nl'}
                      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40 focus:border-indigo-500 dark:focus:border-indigo-500"
                    />
                  </div>
                )}
                {/* Email digest */}
                <div className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dagelijkse e-mailsamenvatting</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ontvang elke ochtend de topdeals en marktsignalen per mail</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={backendPrefs?.email_digest_enabled ?? false}
                      onClick={() => !digestSaving && toggleDigest(!(backendPrefs?.email_digest_enabled ?? false))}
                      disabled={digestSaving || backendPrefs === null}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                        backendPrefs?.email_digest_enabled
                          ? 'border-emerald-600/80 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-600'
                          : 'border-gray-300/80 bg-gray-200 dark:border-gray-500 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out dark:ring-white/15 ${
                          backendPrefs?.email_digest_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Watchlist alerts */}
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Watchlist</p>
              <div className="mb-6">
                <Toggle checked={prefs.notify_watchlist} onChange={(v) => updatePref('notify_watchlist', v)} label="Doelprijzen in je watchlist" description="Zodra een kaart in je watchlist je doelprijs bereikt" />
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={savePrefs}
                  className="px-5 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                >
                  Voorkeuren opslaan
                </button>
                {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">Opgeslagen!</span>}
              </div>
            </>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Voorkeuren</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Weergave</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Licht of donker thema. Wordt op dit apparaat bewaard.</p>
              </div>
              <div className="sm:w-56">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Rondleiding</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bekijk de rondleiding opnieuw</p>
              </div>
              <button
                onClick={() => { activateTour(); router.push('/home'); }}
                className="shrink-0 px-3 py-1.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium"
              >
                Opnieuw bekijken
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sneltoetsen</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bekijk de beschikbare sneltoetsen</p>
              </div>
              <button
                onClick={() => alert('Sneltoetsen:\n\nS - Naar zoeken\nW - Watchlist aan/uit\n? - Sneltoetsen tonen\nESC - Venster sluiten')}
                className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent dark:border-gray-600 transition font-medium"
              >
                Bekijken
              </button>
            </div>
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Lokale gegevens wissen</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wis de op dit apparaat bewaarde watchlist, portfolio en voorkeuren</p>
              </div>
              <button
                onClick={handleClearCache}
                className="shrink-0 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-100 dark:border-red-900/50 transition font-medium"
              >
                Wissen
              </button>
            </div>
          </div>
        </div>

        {/* Danger zone — account deletion (GDPR erasure) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Account verwijderen</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Verwijdert je account en persoonlijke gegevens (e-mail, watchlist) definitief. Dit kan niet ongedaan worden gemaakt.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
              className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/50 transition font-medium"
            >
              Account verwijderen
            </button>
          ) : (
            <div className="space-y-3 max-w-sm">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Bevestig met je wachtwoord
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Wachtwoord"
                autoComplete="current-password"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500/40 outline-none"
              />
              {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-60"
                >
                  {deleting ? 'Verwijderen…' : 'Definitief verwijderen'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Over</h2>
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <p><strong className="text-gray-700 dark:text-gray-300">Versie:</strong> 1.0.0</p>
            <p><strong className="text-gray-700 dark:text-gray-300">Platform:</strong> TCG Pulse, Europese marktdata voor losse ruilkaarten</p>
            <p><strong className="text-gray-700 dark:text-gray-300">Support:</strong> pokemonmarketintel@gmail.com</p>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={() => {}} />
      )}
    </DashboardLayout>
  );
}
