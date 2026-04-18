'use client';

import { useState } from 'react';
import { notificationApi } from '@/lib/api';

// Extended prefs saved locally (whatsapp + signal toggles) since backend only stores email/telegram
function saveLocalPrefs(data: Record<string, unknown>) {
  localStorage.setItem('notification_preferences', JSON.stringify(data));
}

interface Props {
  onClose: () => void;
  onDone: () => void;
}

const SIGNAL_TYPES = [
  { key: 'notify_momentum',   label: 'Momentum',        icon: '🚀', desc: 'Prijs + volume beide stijgend' },
  { key: 'notify_set_trends', label: 'Set Trends',      icon: '📈', desc: 'Hele sets die bewegen' },
  { key: 'notify_price_drop', label: 'Price Drops',     icon: '📉', desc: 'Significante prijsdalingen' },
  { key: 'notify_risk',       label: 'Risk Warnings',   icon: '⚠️',  desc: 'Mogelijke bubble of manipulatie' },
  { key: 'notify_supply',     label: 'Supply Changes',  icon: '📦', desc: 'Listingvolume stijgt of daalt' },
  { key: 'notify_volatility', label: 'Volatility',      icon: '🎢', desc: 'Instabiele prijsactie' },
  { key: 'notify_watchlist',  label: 'Watchlist',       icon: '⭐', desc: 'Bewegingen in jouw watchlist' },
];

export default function SignalSetupWizard({ onClose, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Delivery channels
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');

  // Signal types — defaults aan
  const [selected, setSelected] = useState<Record<string, boolean>>({
    notify_momentum: true,
    notify_set_trends: true,
    notify_price_drop: true,
    notify_risk: true,
    notify_supply: false,
    notify_volatility: false,
    notify_watchlist: true,
  });

  const toggleSignal = (key: string) =>
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));

  const atLeastOneChannel = emailEnabled || telegramEnabled || whatsappEnabled;
  const atLeastOneSignal = Object.values(selected).some(Boolean);

  const handleSave = async () => {
    setSaving(true);

    // Build the full local prefs (includes whatsapp + signal toggles, not stored in backend)
    const localPrefs = {
      email_enabled: emailEnabled,
      email_address: emailAddress,
      telegram_enabled: telegramEnabled,
      telegram_chat_id: telegramChatId,
      whatsapp_enabled: whatsappEnabled,
      whatsapp_number: whatsappNumber,
      whatsapp_api_key: whatsappApiKey,
      ...selected,
      min_priority: 7,
    };

    // Always persist locally first (fast, never fails)
    saveLocalPrefs(localPrefs);

    // Also sync the subset the backend understands
    try {
      await notificationApi.updatePrefs({
        alerts_enabled: emailEnabled || telegramEnabled,
        alert_email: emailEnabled ? emailAddress : undefined,
        telegram_chat_id: telegramEnabled ? telegramChatId : undefined,
      });
    } catch {
      // Backend sync failed — local prefs are still saved, no action needed
    } finally {
      setSaving(false);
      localStorage.setItem('signals_setup_done', '1');
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                Stap {step} van 2
              </p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {step === 1 ? '📬 Hoe wil je alerts ontvangen?' : '⚡ Welke signalen wil je?'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {step === 1
                  ? 'Kies minimaal één kanaal. Je kan dit later altijd wijzigen.'
                  : 'Standaard staan de belangrijkste aan. Pas aan naar eigen voorkeur.'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* ── STAP 1: Delivery channels ── */}
          {step === 1 && (
            <div className="space-y-3">

              {/* Email */}
              <div className={`rounded-xl border-2 p-4 transition cursor-pointer ${emailEnabled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                onClick={() => setEmailEnabled(v => !v)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📧</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">E-mail</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${emailEnabled ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {emailEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Hoge prioriteit signals & watchlist alerts</p>
                {emailEnabled && (
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={e => setEmailAddress(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="jouw@email.com"
                    className="w-full px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mt-1"
                  />
                )}
              </div>

              {/* Telegram */}
              <div className={`rounded-xl border-2 p-4 transition cursor-pointer ${telegramEnabled ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                onClick={() => setTelegramEnabled(v => !v)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✈️</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Telegram</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${telegramEnabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {telegramEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Instant alerts via Telegram bot</p>
                {telegramEnabled && (
                  <div onClick={e => e.stopPropagation()} className="space-y-2 mt-1">
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={e => setTelegramChatId(e.target.value)}
                      placeholder="Telegram Chat ID"
                      className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <p className="text-xs text-gray-400">
                      Stuur <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/start</code> naar{' '}
                      <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@userinfobot</a>{' '}
                      om je Chat ID te vinden.
                    </p>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className={`rounded-xl border-2 p-4 transition cursor-pointer ${whatsappEnabled ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                onClick={() => setWhatsappEnabled(v => !v)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">WhatsApp</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-medium">via CallMeBot</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${whatsappEnabled ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {whatsappEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Alerts direct in WhatsApp via gratis CallMeBot</p>
                {whatsappEnabled && (
                  <div onClick={e => e.stopPropagation()} className="space-y-2 mt-1">
                    <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-300 space-y-1">
                      <p className="font-semibold">Eenmalige activatie (1 minuut):</p>
                      <p>1. Sla op in WhatsApp: <strong>+34 644 65 21 69</strong></p>
                      <p>2. Stuur dit bericht: <code className="bg-white/60 dark:bg-black/30 px-1 rounded">I allow callmebot to send me messages</code></p>
                      <p>3. Je ontvangt een API key — vul die hieronder in.</p>
                    </div>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={e => setWhatsappNumber(e.target.value)}
                      placeholder="+31612345678"
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    />
                    <input
                      type="text"
                      value={whatsappApiKey}
                      onChange={e => setWhatsappApiKey(e.target.value)}
                      placeholder="CallMeBot API key"
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STAP 2: Signal types ── */}
          {step === 2 && (
            <div className="space-y-2">
              {SIGNAL_TYPES.map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSignal(s.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                    selected[s.key]
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                    selected[s.key] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selected[s.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                Later instellen
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!atLeastOneChannel}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                Volgende →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                ← Terug
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !atLeastOneSignal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opslaan…</>
                ) : (
                  '✓ Opslaan & naar Signals'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
