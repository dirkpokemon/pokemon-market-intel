'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { setsApi, PokemonSetInfo, EraInfo } from '@/lib/api';

// Era background gradients for visual variety
const ERA_GRADIENTS: Record<string, string> = {
  'modern':               'from-violet-900 to-indigo-950',
  'scarlet-violet':       'from-red-900 to-rose-950',
  'sword-shield':         'from-blue-900 to-indigo-950',
  'sun-moon':             'from-yellow-800 to-orange-950',
  'xy':                   'from-teal-900 to-cyan-950',
  'black-white':          'from-gray-800 to-zinc-950',
  'heartgold-soulsilver': 'from-amber-900 to-yellow-950',
  'platinum':             'from-slate-700 to-slate-950',
  'diamond-pearl':        'from-blue-800 to-sky-950',
  'ex':                   'from-purple-900 to-violet-950',
  'neo':                  'from-green-900 to-emerald-950',
  'original':             'from-yellow-700 to-amber-950',
};

function setLogoUrl(set: PokemonSetInfo): string | null {
  return set.tcg_api_id ? `https://images.pokemontcg.io/${set.tcg_api_id}/logo.png` : null;
}

function SetCard({ set }: { set: PokemonSetInfo }) {
  const logoUrl = setLogoUrl(set);
  const gradient = ERA_GRADIENTS[set.era] || 'from-gray-800 to-gray-950';
  const [imgError, setImgError] = useState(false);
  const sealedPrice = set.cheapest_sealed ?? undefined;

  return (
    <Link
      href={`/sets/${set.slug}`}
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
          <div className="text-center">
            <span className="text-2xl font-black text-white/20 tracking-tighter leading-none select-none">
              {set.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        {set.deal_count > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {set.deal_count}
          </span>
        )}
      </div>

      {/* Name + sealed price section */}
      <div className="px-3 py-2.5 bg-gray-900">
        <p className="text-xs font-semibold text-gray-200 group-hover:text-white transition line-clamp-2 leading-snug">
          {set.name}
        </p>
        {sealedPrice !== undefined && (
          <div className="flex items-center gap-1 mt-1.5">
            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-400">
              v.a. €{sealedPrice % 1 === 0 ? sealedPrice.toFixed(0) : sealedPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SetsPage() {
  const [search, setSearch] = useState('');
  const [activeEra, setActiveEra] = useState<string>('all');
  const [onlyWithData, setOnlyWithData] = useState(false);
  const [sets, setSets] = useState<PokemonSetInfo[]>([]);
  const [eras, setEras] = useState<EraInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setsApi.list(false)
      .then(res => {
        setSets(res.sets);
        setEras(res.eras);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setsWithData = sets.filter(s => s.deal_count > 0).length;

  // Group sets by era, apply search + era + data filters
  const filteredEras = useMemo(() => {
    return eras
      .filter(era => activeEra === 'all' || era.id === activeEra)
      .map(era => ({
        ...era,
        sets: sets.filter(s => {
          if (s.era !== era.id) return false;
          if (onlyWithData && s.deal_count === 0) return false;
          if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }),
      }))
      .filter(era => era.sets.length > 0);
  }, [sets, eras, search, activeEra, onlyWithData]);

  const totalVisible = filteredEras.reduce((n, e) => n + e.sets.length, 0);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Browse Sets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sets.length} Pokémon TCG sets
            {setsWithData > 0 && (
              <> — <span className="text-emerald-600 dark:text-emerald-400 font-medium">{setsWithData} met marktdata</span></>
            )}
          </p>
        </div>

        {/* Search + era filter + has-data toggle */}
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
            <option value="all">Alle eras ({sets.length} sets)</option>
            {eras.map(era => {
              const count = sets.filter(s => s.era === era.id).length;
              return <option key={era.id} value={era.id}>{era.label} ({count})</option>;
            })}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithData}
              onChange={e => setOnlyWithData(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            Alleen met data
          </label>
        </div>

        {/* Result count when filtering */}
        {(search || activeEra !== 'all' || onlyWithData) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {totalVisible} {totalVisible === 1 ? 'set' : 'sets'} gevonden
          </p>
        )}

        {/* Sets per era */}
        <div className="space-y-10">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
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
                      <SetCard key={set.slug} set={set} />
                    ))}
                  </div>
                </div>
              ))}

              {filteredEras.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Geen sets gevonden{search ? ` voor "${search}"` : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
