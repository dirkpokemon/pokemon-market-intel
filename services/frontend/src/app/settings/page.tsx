'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainNav from '@/components/MainNav';
import ProfileModal from '@/components/ProfileModal';
import OnboardingTour from '@/components/OnboardingTour';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleReplayTour = () => {
    setShowOnboarding(true);
  };

  const handleClearCache = () => {
    if (confirm('This will clear your watchlist and preferences. Continue?')) {
      localStorage.removeItem('watchlist');
      localStorage.removeItem('hasSeenOnboarding');
      alert('Cache cleared! Watchlist and preferences have been reset.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <MainNav user={user} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⚙️</div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainNav user={user} />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">👤 Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Email</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Account Type</p>
                <p className="text-sm text-gray-600">
                  {user.role === 'paid' || user.role === 'pro' ? 'Premium' : 'Free'} Plan
                </p>
              </div>
              {user.role === 'free' && (
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm"
                >
                  Upgrade
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-gray-900">Profile Settings</p>
                <p className="text-sm text-gray-600">Update your profile information</p>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-sm"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎨 Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Onboarding Tour</p>
                <p className="text-sm text-gray-600">Replay the platform walkthrough</p>
              </div>
              <button
                onClick={handleReplayTour}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
              >
                Replay Tour
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Keyboard Shortcuts</p>
                <p className="text-sm text-gray-600">View available shortcuts</p>
              </div>
              <button
                onClick={() => alert('Keyboard Shortcuts:\n\nS - Focus search\nW - Toggle watchlist view\n? - Show shortcuts help\nESC - Close modals')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-sm"
              >
                View Shortcuts
              </button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-gray-900">Clear Cache</p>
                <p className="text-sm text-gray-600">Reset watchlist and preferences</p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold text-sm"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        {(user.role === 'paid' || user.role === 'pro') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔔 Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-semibold text-gray-900">Email Alerts</p>
                  <p className="text-sm text-gray-600">Receive high-priority signals via email</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-gray-900">Telegram Alerts</p>
                  <p className="text-sm text-gray-600">Get instant notifications on Telegram</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">ℹ️ About</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Platform:</strong> Pokémon Market Intelligence EU</p>
            <p><strong>Support:</strong> support@pokemontel.eu</p>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSave={(data) => {
            console.log('Profile updated:', data);
            setShowProfile(false);
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingTour onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
