'use client';

import { Line } from 'react-chartjs-2';
import { PriceHistoryPoint } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface CardHistoryChartProps {
  history: PriceHistoryPoint[];
}

export default function CardHistoryChart({ history }: CardHistoryChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm text-gray-400 font-medium">No history for this window yet</p>
        <p className="text-xs text-gray-300 max-w-[220px]">
          Price history builds up as the scraper runs every hour.
          Try the 60D view, or check back in a few days.
        </p>
      </div>
    );
  }

  const labels = history.map(p => {
    const d = new Date(p.date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Avg price',
        data: history.map(p => p.avg_price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 14 ? 0 : 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Min price',
        data: history.map(p => p.min_price),
        borderColor: 'rgba(34, 197, 94, 0.7)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        padding: 10,
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label ?? '';
            return ` ${label}: €${ctx.parsed.y.toFixed(2)}`;
          },
          afterBody: (items: any[]) => {
            const idx = items[0]?.dataIndex;
            if (idx != null) {
              return [`  Listings: ${history[idx].listing_count}`];
            }
            return [];
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v: any) => `€${Number(v).toFixed(2)}`,
          font: { size: 11 },
          color: '#9ca3af',
        },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: {
        ticks: {
          maxTicksLimit: 8,
          font: { size: 11 },
          color: '#9ca3af',
        },
        grid: { display: false },
      },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  };

  return <Line data={data} options={options} />;
}
