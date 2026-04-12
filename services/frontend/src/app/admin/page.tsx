'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi, AdminStatsResponse } from '@/lib/api';

function formatDt(iso?: string | null) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    setError(null);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load admin stats');
      }
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 lg:pl-[240px] pt-16 lg:pt-0 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
              <p className="text-sm text-gray-500 mt-1">Operational overview (admin only)</p>
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading && !stats && !forbidden && !error && (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            </div>
          )}

          {forbidden && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-lg mx-auto">
              <p className="text-gray-900 font-medium mb-2">Admin access required</p>
              <p className="text-sm text-gray-500 mb-6">
                Your account does not have the admin role. Ask an operator to set{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">role = &apos;admin&apos;</code> in the database.
              </p>
              <Link
                href="/home"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Back to Home
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 text-sm mb-6">
              {error}
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {[
                  { label: 'Users', value: stats.users_total, sub: `${stats.users_verified} verified` },
                  { label: 'Raw prices rows', value: stats.raw_prices_count.toLocaleString(), sub: `${stats.raw_distinct_cards.toLocaleString()} distinct cards` },
                  { label: 'Active signals', value: stats.signals_active },
                  { label: 'Active deal scores', value: stats.deal_scores_active },
                ].map((c) => (
                  <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{c.value}</p>
                    {c.sub && <p className="text-xs text-gray-500 mt-1">{c.sub}</p>}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Users by role</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.users_by_role).map(([role, count]) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800"
                    >
                      <span className="font-medium capitalize">{role}</span>
                      <span className="tabular-nums text-gray-600">{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Recent scrapes</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Last 15 runs from scrape_logs</p>
                  </div>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium">Source</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium text-right">Items</th>
                          <th className="px-4 py-2 font-medium">Started</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.last_scrapes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">
                              No scrape logs (table missing or empty)
                            </td>
                          </tr>
                        ) : (
                          stats.last_scrapes.map((row, i) => (
                            <tr key={`${row.source}-${row.started_at}-${i}`} className="hover:bg-gray-50/80">
                              <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-[140px]" title={row.source || ''}>
                                {row.source || 'N/A'}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                    row.status === 'success' || row.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : row.status === 'failed' || row.status === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {row.status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                                {row.items_scraped ?? 'N/A'}
                                {(row.errors_count ?? 0) > 0 && (
                                  <span className="text-red-600 ml-1">({row.errors_count} err)</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-600 whitespace-nowrap text-xs">{formatDt(row.started_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Recent signups</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Last 25 users by created_at</p>
                  </div>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium">Email</th>
                          <th className="px-4 py-2 font-medium">Role</th>
                          <th className="px-4 py-2 font-medium">Verified</th>
                          <th className="px-4 py-2 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.recent_users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-2 text-gray-900 truncate max-w-[200px]" title={u.email}>
                              {u.email}
                            </td>
                            <td className="px-4 py-2 capitalize text-gray-700">{u.role}</td>
                            <td className="px-4 py-2">{u.is_verified ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-2 text-gray-600 whitespace-nowrap text-xs">{formatDt(u.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
