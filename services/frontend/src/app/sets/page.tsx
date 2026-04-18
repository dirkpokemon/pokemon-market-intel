'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ERAS, ALL_SETS } from '@/lib/pokemon-sets';

export default function SetsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeEra, setActiveEra] = useState<string>('all');

  const filteredEras = useMemo(() => {
    if (!search && activeEra === 'all') return ERAS;

    return ERAS
      .filter(era => activeEra === 'all' || era.id === activeEra)
      .map(era => ({
        ...era,
        sets: era.sets.filter(s =>
          !search || s.name.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter(era => era.sets.length > 0);
  }, [search, activeEra]);

  const handleSetClick = (setId: string) => {
    router.push(`/sets/${setId}`);
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Browse Sets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Alle Pokémon TCG sets — bekijk sealed box prijzen en losse kaartdeals.
          </p>
        </div>

        {/* Search + era filter */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek een set…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
            />
          </div>
          <select
            value={activeEra}
            onChange={e => setActiveEra(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/40 outline-none"
          >
            <option value="all">Alle eras ({ALL_SETS.length} sets)</option>
            {ERAS.map(era => (
              <option key={era.id} value={era.id}>{era.label} ({era.sets.length})</option>
            ))}
          </select>
        </div>

        {/* Sets per era */}
        <div className="space-y-8">
          {filteredEras.map(era => (
            <div key={era.id}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                {era.label}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {era.sets.map(set => (
                  <button
                    key={set.id}
                    onClick={() => handleSetClick(set.id)}
                    className="text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition group"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-snug line-clamp-2">
                      {set.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredEras.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Geen sets gevonden voor &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
