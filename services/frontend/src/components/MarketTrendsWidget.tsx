'use client';

interface MarketTrendsProps {
  dealScores: any[];
}

export default function MarketTrendsWidget({ dealScores }: MarketTrendsProps) {
  // Calculate market temperature
  const avgScore = dealScores.length > 0
    ? dealScores.reduce((sum, d) => sum + d.deal_score, 0) / dealScores.length
    : 0;

  const getMarketTemperature = () => {
    if (avgScore >= 75) return { label: 'Hot', emoji: '🔥', color: 'text-red-600 bg-red-50', description: 'Excellent deals available' };
    if (avgScore >= 65) return { label: 'Warm', emoji: '☀️', color: 'text-orange-600 bg-orange-50', description: 'Good buying opportunity' };
    return { label: 'Cool', emoji: '❄️', color: 'text-blue-600 bg-blue-50', description: 'Wait for better deals' };
  };

  const temperature = getMarketTemperature();

  // Mock trending data (in production, fetch from API)
  const trendingCards = [
    { name: 'Charizard VSTAR', change: '+15%' },
    { name: 'Pikachu VMAX', change: '+12%' },
    { name: 'Mewtwo V', change: '+8%' }
  ];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span>
        Market Insights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market Temperature */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Market Temperature</p>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${temperature.color}`}>
            <span className="text-2xl">{temperature.emoji}</span>
            <span className="text-xl">{temperature.label}</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">{temperature.description}</p>
        </div>

        {/* Price Trend */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Weekly Price Change</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">↓ 5%</span>
            <span className="text-sm text-gray-600">vs last week</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">Prices trending down</p>
        </div>

        {/* Most Active Set */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Most Active Set</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎴</span>
            <div>
              <p className="font-bold text-gray-900">Crown Zenith</p>
              <p className="text-xs text-gray-600">1,234 listings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Cards */}
      <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-3">🔥 Trending This Week</p>
        <div className="space-y-2">
          {trendingCards.map((card, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{card.name}</span>
              <span className="text-sm font-bold text-green-600">{card.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
