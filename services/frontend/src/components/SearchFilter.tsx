'use client';

import { useState } from 'react';

export interface FilterOptions {
  search: string;
  minScore: number;
  maxScore: number;
  minPrice: number;
  maxPrice: number;
  category: 'all' | 'singles' | 'sealed';
}

interface SearchFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSortChange: (sort: string) => void;
  currentSort: string;
}

export default function SearchFilter({ onFilterChange, onSortChange, currentSort }: SearchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    minScore: 60,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 1000,
    category: 'all'
  });

  const handleFilterUpdate = (updates: Partial<FilterOptions>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      minScore: 60,
      maxScore: 100,
      minPrice: 0,
      maxPrice: 1000,
      category: 'all'
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const quickFilters = [
    { label: '⭐ Excellent Only', action: () => handleFilterUpdate({ minScore: 80 }) },
    { label: '💰 Under €50', action: () => handleFilterUpdate({ maxPrice: 50 }) },
    { label: '🎴 Singles', action: () => handleFilterUpdate({ category: 'singles' }) },
    { label: '📦 Sealed', action: () => handleFilterUpdate({ category: 'sealed' }) },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      {/* Search Bar & Sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search deals by product name or set..."
            value={filters.search}
            onChange={(e) => handleFilterUpdate({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
        </div>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="score-desc">Best Score First</option>
          <option value="price-asc">Lowest Price First</option>
          <option value="price-desc">Highest Price First</option>
          <option value="savings-desc">Highest Savings First</option>
        </select>

        {/* Advanced Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
        >
          <span>🎯 Filters</span>
          <span className="text-sm text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {quickFilters.map((filter, idx) => (
          <button
            key={idx}
            onClick={filter.action}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition"
          >
            {filter.label}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 underline"
        >
          Clear All
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Score Range: {filters.minScore} - {filters.maxScore}
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => handleFilterUpdate({ minScore: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={filters.maxScore}
                  onChange={(e) => handleFilterUpdate({ maxScore: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range: €{filters.minPrice} - €{filters.maxPrice}
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterUpdate({ minPrice: parseFloat(e.target.value) })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterUpdate({ maxPrice: parseFloat(e.target.value) })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="flex gap-2">
              {(['all', 'singles', 'sealed'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleFilterUpdate({ category: cat })}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filters.category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
