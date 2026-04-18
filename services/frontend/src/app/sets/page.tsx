'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ERAS, ALL_SETS, PokemonSet, setLogoUrl } from '@/lib/pokemon-sets';

// Era background gradients for visual variety
const ERA_GRADIENTS: Record<string, string> = {
  'modern':        'from-violet-900 to-indigo-950',
  'scarlet-violet':'from-red-900 to-rose-950',
  'sword-shield':  'from-blue-900 to-indigo-950',
  'sun-moon':      'from-yellow-800 to-orange-950',
  'xy':            'from-teal-900 to-cyan-950',
  'bw':            'from-gray-800 to-zinc-950',
  'hgss':          'from-amber-900 to-yellow-950',
  'platinum':      'from-slate-700 to-slate-950',
  'dp':            'from-blue-800 to-sky-950',
  'ex':            'from-purple-900 to-violet-950',
  'neo':           'from-green-900 to-emerald-950',
  'original':      'from-yellow-700 to-amber-950',
};

function SetCard({ set }: { set: PokemonSet }) {
  const logoUrl = setLogoUrl(set);
  const gradient = ERA_GRADIENTS[set.era] || 'from-gray-800 to-gray-950';
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/sets/${set.id}`}
      className="group block rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition hover:shadow-lg hover:shadow-black/30"
    >
      {/* Art section with gradient background */}
      <div className={`relative h-24 bg-gradient-to-br ${gradient} flex items-center justify-center p-3`}>
        {logoUrl && !imgError ? (
          <Image
            src={logoUrl}
            alt={set.name}
            width={180}
            height={64}
            unoptimized
            onError={() => setImgError(true)}
            className="object-contain max-h-16 w-auto drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          /* Fallback: stylised set name abbreviation */
          <div className="text-center">
            <span className="text-2xl font-black text-white/20 tracking-tighter leading-none select-none">
              {set.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name section */}
      <div className="px-3 py-2.5 bg-gray-900">
        <p className="text-xs font-semibold text-gray-200 group-hover:text-white transition line-clamp-2 leading-snug">
          {set.name}
        </p>
      </div>
    </Link>
  );
}

export default function SetsPage() {
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

  const totalVisible = filteredEras.reduce((n, e) => n + e.sets.length, 0);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Browse Sets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {ALL_SETS.length} Pokémon TCG sets — sealed box prijzen &amp; losse kaartdeals.
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
              placeholder="Zoek een set… (bijv. Destined Rivals)"
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

        {/* Result count when filtering */}
        {(search || activeEra !== 'all') && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {totalVisible} {totalVisible === 1 ? 'set' : 'sets'} gevonden
          </p>
        )}

        {/* Sets per era */}
        <div className="space-y-10">
          {filteredEras.map(era => (
            <div key={era.id}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {era.label}
                </h2>
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  {era.sets.length} sets
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {era.sets.map(set => (
                  <SetCard key={set.id} set={set} />
                ))}
              </div>
            </div>
          ))}

          {filteredEras.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Geen sets gevonden voor &quot;{search}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
