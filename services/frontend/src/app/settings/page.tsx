'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileModal from '@/components/ProfileModal';
import OnboardingTour from '@/components/OnboardingTour';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const handleClearCache = () => {
    if (confirm('This will clear your watchlist and preferences. Continue?')) {
      localStorage.removeItem('watchlist');
      localStorage.removeItem('hasSeenOnboarding');
      localStorage.removeItem('price_alerts');
      alert('Cache cleared!');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
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
                <p className="text-xs text-gray-500 capitalize">{user?.role === 'paid' || user?.role === 'pro' ? 'Premium' : 'Free'}</p>
              </div>
              {user?.role === 'free' && (
                <button onClick={() => router.push('/pricing')} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition font-medium">
                  Upgrade
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
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

        {/* Preferences */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Onboarding Tour</p>
                <p className="text-xs text-gray-500">Replay the platform walkthrough</p>
              </div>
              <button onClick={() => setShowOnboarding(true)} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition font-medium">
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
                <p className="text-xs text-gray-500">Reset watchlist, alerts, and preferences</p>
              </div>
              <button onClick={handleClearCache} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs rounded-lg hover:bg-red-100 transition font-medium">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {(user?.role === 'paid' || user?.role === 'pro') && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Alerts</p>
                  <p className="text-xs text-gray-500">High-priority signals via email</p>
                </div>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Telegram Alerts</p>
                  <p className="text-xs text-gray-500">Instant notifications on Telegram</p>
                </div>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">ACTIVE</span>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">About</h2>
          <div className="space-y-2 text-xs text-gray-500">
            <p><strong className="text-gray-700">Version:</strong> 1.0.0</p>
            <p><strong className="text-gray-700">Platform:</strong> Pokémon Market Intelligence EU</p>
            <p><strong className="text-gray-700">Support:</strong> support@pokemontel.eu</p>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={(data) => { console.log('Profile updated:', data); setShowProfile(false); }} />
      )}
      {showOnboarding && (
        <OnboardingTour onComplete={() => setShowOnboarding(false)} />
      )}
    </DashboardLayout>
  );
}
