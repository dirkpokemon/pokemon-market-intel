'use client';

import { useState } from 'react';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications'>('profile');
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramNotifications, setTelegramNotifications] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [dealScoreThreshold, setDealScoreThreshold] = useState(80);
  const [defaultSort, setDefaultSort] = useState('score-desc');

  const handleSave = () => {
    const profileData = {
      displayName,
      emailNotifications,
      telegramNotifications,
      telegramChatId,
      priceAlerts,
      dealScoreThreshold,
      defaultSort
    };
    onSave(profileData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <span className="text-2xl text-gray-400">×</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'preferences'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ⚙️ Preferences
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'notifications'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🔔 Notifications
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your display name"
                  />
                  <p className="text-xs text-gray-500 mt-1">This is how you&apos;ll appear in the platform</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact support to change your email</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-4 py-2 text-sm font-bold rounded-lg ${
                      user?.role === 'paid' || user?.role === 'pro' 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {user?.role?.toUpperCase() || 'FREE'} PLAN
                    </span>
                    {user?.role === 'free' && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 underline">
                        Upgrade to Premium
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Deals Viewed</p>
                      <p className="text-lg font-bold text-gray-900">248</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Watchlist Items</p>
                      <p className="text-lg font-bold text-gray-900">12</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Alerts Received</p>
                      <p className="text-lg font-bold text-gray-900">34</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Member Since</p>
                      <p className="text-lg font-bold text-gray-900">Jan 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Sort Order
                  </label>
                  <select
                    value={defaultSort}
                    onChange={(e) => setDefaultSort(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="score-desc">Best Score First</option>
                    <option value="price-asc">Lowest Price First</option>
                    <option value="price-desc">Highest Price First</option>
                    <option value="savings-desc">Highest Savings First</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deal Score Alert Threshold
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="60"
                      max="100"
                      value={dealScoreThreshold}
                      onChange={(e) => setDealScoreThreshold(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-gray-900 w-12 text-right">
                      {dealScoreThreshold}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Get notified when deals have a score of {dealScoreThreshold} or higher
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Price Drop Alerts</p>
                    <p className="text-xs text-gray-500 mt-1">Get notified when watchlist items drop in price</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceAlerts}
                      onChange={(e) => setPriceAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Display Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">Compact View</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">Show Charts by Default</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Premium Feature</p>
                      <p className="text-sm text-blue-800">
                        Real-time alerts are available for Premium users. Upgrade to receive instant notifications for high-value deals!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-500 mt-1">Receive deal alerts via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Telegram Notifications</p>
                    <p className="text-xs text-gray-500 mt-1">Get instant alerts on Telegram</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telegramNotifications}
                      onChange={(e) => setTelegramNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {telegramNotifications && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telegram Chat ID
                    </label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your Telegram Chat ID"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <a href="#" className="text-blue-600 hover:underline">How to get your Chat ID</a>
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Notification Frequency</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" value="instant" defaultChecked className="text-blue-600" />
                      <span className="text-sm text-gray-700">Instant (as they happen)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" value="daily" className="text-blue-600" />
                      <span className="text-sm text-gray-700">Daily Digest (once per day)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" value="weekly" className="text-blue-600" />
                      <span className="text-sm text-gray-700">Weekly Summary</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
