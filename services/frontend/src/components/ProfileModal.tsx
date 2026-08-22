'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');

  // Profile tab
  const [displayName, setDisplayName] = useState(user?.full_name || user?.email?.split('@')[0] || '');

  // Password tab
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Notifications tab
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = () => {
    onSave({ displayName, emailNotifications });
    onClose();
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Vul alle velden in.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Nieuwe wachtwoorden komen niet overeen.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Nieuw wachtwoord moet minimaal 8 tekens zijn.');
      return;
    }

    try {
      setPwLoading(true);
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess('Wachtwoord succesvol gewijzigd!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.message || 'Er ging iets mis. Controleer je huidige wachtwoord.');
    } finally {
      setPwLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: '👤 Profiel' },
    { id: 'password' as const, label: '🔑 Wachtwoord' },
    { id: 'notifications' as const, label: '🔔 Notificaties' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl mx-auto border border-gray-200 dark:border-gray-800">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Instellingen</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 text-xl">
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-sm font-medium border-b-2 transition mr-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">

            {/* ── PROFIEL TAB ── */}
            {activeTab === 'profile' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Naam</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                    placeholder="Je naam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">E-mailadres</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Neem contact op voor wijziging</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Account type</label>
                  <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg ${
                    user?.role === 'paid' || user?.role === 'pro' || user?.role === 'admin'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {(user?.role || 'free').toUpperCase()}
                  </span>
                </div>
              </>
            )}

            {/* ── WACHTWOORD TAB ── */}
            {activeTab === 'password' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Huidig wachtwoord</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nieuw wachtwoord</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                    placeholder="Minimaal 8 tekens"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Herhaal nieuw wachtwoord</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                {pwError && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    {pwError}
                  </p>
                )}
                {pwSuccess && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    {pwSuccess}
                  </p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                >
                  {pwLoading ? 'Opslaan…' : 'Wachtwoord wijzigen'}
                </button>
              </>
            )}

            {/* ── NOTIFICATIES TAB ── */}
            {activeTab === 'notifications' && (
              <>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                  Notificaties zijn beschikbaar voor Plus en Business accounts.
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">E-mailmeldingen</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ontvang dealwaarschuwingen per e-mail</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailNotifications}
                    aria-label="E-mailmeldingen"
                    onClick={() => setEmailNotifications(v => !v)}
                    className={`relative inline-flex h-6 w-11 rounded-full border transition-colors ${
                      emailNotifications ? 'bg-emerald-500 border-emerald-600' : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${emailNotifications ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              Annuleren
            </button>
            {activeTab !== 'password' && (
              <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition">
                Opslaan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
