'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { marketApi, DealScore } from '@/lib/api';
import MainNav from '@/components/MainNav';
import dynamic from 'next/dynamic';
import MarketTrendsWidget from '@/components/MarketTrendsWidget';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });
const DealScoreChart = dynamic(() => import('@/components/DealScoreChart'), { ssr: false });

export default function InsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);

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

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const scores = await marketApi.getDealScores({ limit: 100, min_score: 50 });
      setDealScores(scores);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <MainNav user={user} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">📊</div>
            <p className="text-gray-600">Loading market insights...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const avgPrice = dealScores.length > 0 
    ? dealScores.reduce((sum, d) => sum + d.current_price, 0) / dealScores.length 
    : 0;
  
  const totalVolume = dealScores.length; // Total number of tracked products
  
  const priceRanges = {
    under10: dealScores.filter(d => d.current_price < 10).length,
    range10to50: dealScores.filter(d => d.current_price >= 10 && d.current_price < 50).length,
    range50to100: dealScores.filter(d => d.current_price >= 50 && d.current_price < 100).length,
    over100: dealScores.filter(d => d.current_price >= 100).length,
  };

  const scoreRanges = {
    excellent: dealScores.filter(d => d.deal_score >= 80).length,
    good: dealScores.filter(d => d.deal_score >= 70 && d.deal_score < 80).length,
    fair: dealScores.filter(d => d.deal_score >= 60 && d.deal_score < 70).length,
    below60: dealScores.filter(d => d.deal_score < 60).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainNav user={user} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Market Insights</h1>
          <p className="text-gray-600">Deep analytics and trends for the EU Pokémon TCG market</p>
        </div>

        {/* Key Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Average Price</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">€{avgPrice.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Across all products</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Products</span>
              <span className="text-2xl">🎴</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{dealScores.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tracked listings</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">30-Day Volume</span>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalVolume}</p>
            <p className="text-xs text-gray-500 mt-1">Total transactions</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Excellent Deals</span>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{scoreRanges.excellent}</p>
            <p className="text-xs text-gray-500 mt-1">Score 80+</p>
          </div>
        </div>

        {/* Market Trends Widget */}
        <div className="mb-8">
          <MarketTrendsWidget dealScores={dealScores} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Overview Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Price Overview</h2>
            <div style={{ height: '350px' }}>
              <PriceChart deals={dealScores} />
            </div>
          </div>

          {/* Deal Score Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Deal Score Distribution</h2>
            <div style={{ height: '350px' }}>
              <DealScoreChart deals={dealScores.slice(0, 15)} />
            </div>
          </div>
        </div>

        {/* Price Range Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">💎 Price Range Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💚</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{priceRanges.under10}</p>
              <p className="text-sm text-gray-600">Under €10</p>
              <div className="mt-2 bg-green-100 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(priceRanges.under10 / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💙</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{priceRanges.range10to50}</p>
              <p className="text-sm text-gray-600">€10 - €50</p>
              <div className="mt-2 bg-blue-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${(priceRanges.range10to50 / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💛</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{priceRanges.range50to100}</p>
              <p className="text-sm text-gray-600">€50 - €100</p>
              <div className="mt-2 bg-yellow-100 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${(priceRanges.range50to100 / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💜</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{priceRanges.over100}</p>
              <p className="text-sm text-gray-600">Over €100</p>
              <div className="mt-2 bg-purple-100 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(priceRanges.over100 / dealScores.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deal Score Quality */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">⭐ Deal Quality Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="font-semibold text-gray-900">Excellent (80+)</span>
                </div>
                <span className="text-gray-600 font-medium">{scoreRanges.excellent} deals</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full" 
                  style={{ width: `${(scoreRanges.excellent / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="font-semibold text-gray-900">Good (70-79)</span>
                </div>
                <span className="text-gray-600 font-medium">{scoreRanges.good} deals</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full" 
                  style={{ width: `${(scoreRanges.good / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="font-semibold text-gray-900">Fair (60-69)</span>
                </div>
                <span className="text-gray-600 font-medium">{scoreRanges.fair} deals</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full" 
                  style={{ width: `${(scoreRanges.fair / dealScores.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="font-semibold text-gray-900">Below Average (&lt;60)</span>
                </div>
                <span className="text-gray-600 font-medium">{scoreRanges.below60} deals</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div 
                  className="bg-gray-400 h-3 rounded-full" 
                  style={{ width: `${(scoreRanges.below60 / dealScores.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
