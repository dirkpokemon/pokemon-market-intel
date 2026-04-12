'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { marketApi, DealScore, MarketDigest } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import MarketPulseAssistant from '@/components/MarketPulseAssistant';
import { isSubscriberRole } from '@/lib/plans';

function formatDigestTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function MarketPulsePage() {
  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [digest, setDigest] = useState<MarketDigest | null>(null);
  const [userRole, setUserRole] = useState<string>('free');
  const [selectedSet, setSelectedSet] = useState('');
  const [availableSets, setAvailableSets] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUserRole(JSON.parse(raw).role || 'free');
      } catch {
        /* keep free */
      }
    }
  }, []);

  const isSubscriber = isSubscriberRole(userRole);

  const loadData = useCallback(async (setFilter: string) => {
    const trimmed = setFilter.trim();
    const productSet = trimmed || undefined;
    try {
      setLoading(true);
      const [scoresRes, digRes] = await Promise.allSettled([
        marketApi.getDealScores({
          limit: 100,
          min_score: 40,
          ...(productSet ? { product_set: productSet } : {}),
        }),
        marketApi.getMarketDigest(),
      ]);

      if (scoresRes.status === 'fulfilled') {
        setDealScores(scoresRes.value);
        if (!productSet) {
          const names = scoresRes.value
            .map((d) => d.product_set)
            .filter((s): s is string => Boolean(s && s !== 'Unknown'));
          const uniq = [...new Set(names)].sort((a, b) => a.localeCompare(b));
          setAvailableSets(uniq);
        }
      } else {
        setDealScores([]);
      }

      if (digRes.status === 'fulfilled') setDigest(digRes.value);
      else setDigest(null);
    } catch (err) {
      console.error('Error loading market pulse:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedSet);
  }, [selectedSet, loadData]);

  const visibleDeals = useMemo(() => {
    if (isSubscriber) return dealScores;
    return dealScores
      .filter((d) => d.deal_score >= 65)
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, 20);
  }, [dealScores, isSubscriber]);

  const marketData = useMemo(() => {
    if (visibleDeals.length === 0) return null;

    const avgPrice = visibleDeals.reduce((sum, d) => sum + d.current_price, 0) / visibleDeals.length;
    const avgScore = visibleDeals.reduce((sum, d) => sum + d.deal_score, 0) / visibleDeals.length;

    const cardsWithDelta = visibleDeals
      .filter((d) => d.market_avg_price && d.market_avg_price > 0)
      .map((d) => ({
        ...d,
        delta:
          ((d.current_price - (d.market_avg_price || d.current_price)) / (d.market_avg_price || d.current_price)) * 100,
      }));

    const buying = [...cardsWithDelta].filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);
    const overpriced = [...cardsWithDelta].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);

    const ranges = {
      under5: visibleDeals.filter((d) => d.current_price < 5).length,
      range5to20: visibleDeals.filter((d) => d.current_price >= 5 && d.current_price < 20).length,
      range20to50: visibleDeals.filter((d) => d.current_price >= 20 && d.current_price < 50).length,
      over50: visibleDeals.filter((d) => d.current_price >= 50).length,
    };

    const scoreDistribution = {
      excellent: visibleDeals.filter((d) => d.deal_score >= 80).length,
      good: visibleDeals.filter((d) => d.deal_score >= 65 && d.deal_score < 80).length,
      fair: visibleDeals.filter((d) => d.deal_score >= 50 && d.deal_score < 65).length,
      low: visibleDeals.filter((d) => d.deal_score < 50).length,
    };

    const sets = visibleDeals.reduce(
      (acc, d) => {
        const set = d.product_set || 'Unknown';
        if (!acc[set]) acc[set] = { count: 0, totalScore: 0, totalPrice: 0 };
        acc[set].count++;
        acc[set].totalScore += d.deal_score;
        acc[set].totalPrice += d.current_price;
        return acc;
      },
      {} as Record<string, { count: number; totalScore: number; totalPrice: number }>
    );

    const topSets = Object.entries(sets)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        avgPrice: data.totalPrice / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      avgPrice,
      avgScore: Math.round(avgScore),
      totalProducts: visibleDeals.length,
      buying: buying.slice(0, 10),
      overpriced: overpriced.slice(0, 10),
      ranges,
      scoreDistribution,
      topSets,
    };
  }, [visibleDeals]);

  const lastUpdated = formatDigestTime(digest?.last_analysis_at);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full flex flex-col min-h-[calc(100dvh-10rem)]">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Pulse</h1>
          <p className="text-sm text-gray-500 mt-1">
            Markt-assistent — kies een suggestie voor antwoorden uit live data.{' '}
            {isSubscriber
              ? `${dealScores.length} listings · uurlijks ververst${lastUpdated ? ` · ${lastUpdated}` : ''}`
              : `Free: top 20 (score ≥65)${lastUpdated ? ` · ${lastUpdated}` : ''}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <label htmlFor="pulse-set-filter" className="text-xs font-medium text-gray-500 shrink-0 sm:w-20">
              Set
            </label>
            <select
              id="pulse-set-filter"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              disabled={loading && availableSets.length === 0}
              className="flex-1 max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            >
              <option value="">Alle sets</option>
              {availableSets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {selectedSet ? (
            <Link
              href={`/deals?set=${encodeURIComponent(selectedSet)}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0"
            >
              Open in Deals →
            </Link>
          ) : null}
        </div>

        {!loading && !isSubscriber && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 shrink-0">
            <p className="text-xs text-amber-900">
              Free: beperkte steekproef — <span className="font-medium">Plus</span> gebruikt de volledige catalogus in Pulse.
            </p>
            <Link
              href="/pricing"
              className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition text-center"
            >
              Upgrade to Plus
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1 min-h-[320px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Marktdata laden…</p>
            </div>
          </div>
        ) : marketData ? (
          <div className="flex-1 flex flex-col min-h-0">
            <MarketPulseAssistant
              marketData={marketData}
              visibleDeals={visibleDeals}
              digest={digest}
              isSubscriber={isSubscriber}
              lastUpdatedLine={lastUpdated}
              selectedSetLabel={selectedSet}
              className="flex-1 shadow-md"
            />
          </div>
        ) : (
          <div className="text-center py-20 flex-1">
            <p className="text-gray-500 mb-4">Geen marktdata voor dit filter.</p>
            {selectedSet && (
              <button
                type="button"
                onClick={() => setSelectedSet('')}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Filter wissen
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
