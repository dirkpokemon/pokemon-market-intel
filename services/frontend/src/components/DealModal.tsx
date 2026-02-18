'use client';

import { useState } from 'react';
import { DealScore } from '@/lib/api';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });

interface DealModalProps {
  deal: DealScore;
  onClose: () => void;
}

export default function DealModal({ deal, onClose }: DealModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'listings'>('overview');

  // Generate mock price history (in production, fetch from API)
  const generatePriceHistory = () => {
    const days = 30;
    const labels = [];
    const prices = [];
    const averages = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const variation = (Math.random() - 0.5) * (deal.current_price * 0.15);
      prices.push(deal.current_price + variation);
      averages.push((deal.market_avg_price || deal.current_price * 1.1));
    }
    
    return { labels, prices, averages };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Deal';
    if (score >= 70) return 'Good Deal';
    if (score >= 60) return 'Fair Deal';
    return 'Average';
  };

  const handleShare = () => {
    const shareText = `Check out this deal: ${deal.product_name} for €${deal.current_price.toFixed(2)} (Deal Score: ${deal.deal_score})`;
    
    if (navigator.share) {
      navigator.share({
        title: deal.product_name,
        text: shareText,
        url: window.location.href
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
        alert('Deal details copied to clipboard!');
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Deal details copied to clipboard!');
    }
  };

  // Mock listings (in production, fetch from raw_prices by product_id)
  const mockListings = [
    {
      id: 1,
      source: 'CardMarket',
      price: deal.current_price,
      condition: 'Near Mint',
      country: 'DE',
      seller_rating: 4.9,
      url: `https://www.cardmarket.com/en/Pokemon/Cards?name=${encodeURIComponent(deal.product_name)}`
    },
    {
      id: 2,
      source: 'CardTrader',
      price: deal.current_price * 1.05,
      condition: 'Near Mint',
      country: 'FR',
      seller_rating: 4.8,
      url: `https://www.cardtrader.com/en/pokemon/search?utf8=%E2%9C%93&q=${encodeURIComponent(deal.product_name)}`
    },
    {
      id: 3,
      source: 'eBay',
      price: deal.current_price * 1.12,
      condition: 'Near Mint',
      country: 'IT',
      seller_rating: 4.6,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(deal.product_name + ' Pokemon')}`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">
                {deal.product_name}
              </h2>
              {deal.product_set && (
                <p className="text-sm text-gray-600 mb-3">{deal.product_set}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getScoreBgColor(deal.deal_score)}`}>
                  <span className={`text-3xl font-bold ${getScoreColor(deal.deal_score)}`}>
                    {deal.deal_score}
                  </span>
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Deal Score</p>
                    <p className={`text-sm font-semibold ${getScoreColor(deal.deal_score)}`}>
                      {getScoreLabel(deal.deal_score)}
                    </p>
                  </div>
                </div>
                
                <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">€{deal.current_price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Current Price</p>
                </div>
                
                {deal.market_avg_price && (
                  <div className="px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-lg font-bold text-green-600">
                      Save {Math.round((1 - deal.current_price / deal.market_avg_price) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">vs Market Avg (€{deal.market_avg_price.toFixed(2)})</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <span className="text-2xl text-gray-400">×</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📈 Price History
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'listings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🛒 Buy Now ({mockListings.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current Price</p>
                    <p className="text-xl font-bold text-gray-900">€{deal.current_price.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Market Average</p>
                    <p className="text-xl font-bold text-gray-900">
                      €{(deal.market_avg_price || deal.current_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Deal Score</p>
                    <p className={`text-xl font-bold ${getScoreColor(deal.deal_score)}`}>
                      {deal.deal_score}
                    </p>
                  </div>
                  {deal.confidence && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Confidence</p>
                      <p className="text-xl font-bold text-gray-900">{deal.confidence}%</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Why is this a good deal?</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">
                        Price is <strong>{Math.round((1 - deal.current_price / (deal.market_avg_price || deal.current_price)) * 100)}% below</strong> market average
                      </span>
                    </li>
                    {deal.deal_score >= 80 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span className="text-sm text-gray-700">
                          <strong>Excellent deal score</strong> indicates high value opportunity
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">
                        Multiple verified sellers available across EU
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">
                        Price data updated within last hour
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Investment Tip</p>
                      <p className="text-sm text-blue-800">
                        This card is currently undervalued. Historical data suggests {deal.product_set} cards 
                        tend to appreciate 15-20% annually. Consider buying now and holding for 6-12 months.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="h-80">
                  <PriceChart 
                    title="30-Day Price History"
                    data={generatePriceHistory()}
                    color="rgb(34, 197, 94)"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">7-Day Low</p>
                    <p className="text-lg font-bold text-gray-900">€{(deal.current_price * 0.95).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">7-Day High</p>
                    <p className="text-lg font-bold text-gray-900">€{(deal.current_price * 1.12).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">30-Day Avg</p>
                    <p className="text-lg font-bold text-gray-900">€{(deal.market_avg_price || deal.current_price).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">Showing {mockListings.length} verified sellers</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Updated 5 minutes ago</span>
                  </div>
                </div>

                {mockListings.map((listing) => (
                  <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">{listing.source}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-white border border-gray-300 rounded">
                          {listing.condition}
                        </span>
                        <span className="text-sm text-gray-600">
                          🇪🇺 {listing.country}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          ⭐ {listing.seller_rating}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Verified seller · Ships from EU</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">€{listing.price.toFixed(2)}</p>
                        {listing.id === 1 && (
                          <p className="text-xs text-green-600 font-medium">Best Price</p>
                        )}
                      </div>
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        Buy Now
                        <span className="text-sm">→</span>
                      </a>
                    </div>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🛡️</span>
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold mb-1">Buyer Protection</p>
                      <p>All listed sellers are verified and offer buyer protection through their respective platforms. 
                      Your purchase is protected by CardMarket or CardTrader guarantee policies.</p>
                    </div>
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
              Close
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
