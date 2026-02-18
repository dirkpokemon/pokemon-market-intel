'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface MarketOverviewProps {
  stats: {
    totalListings: number;
    signalsCounts: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export default function MarketOverviewChart({ stats }: MarketOverviewProps) {
  const chartData = {
    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
    datasets: [
      {
        label: 'Active Signals',
        data: [stats.signalsCounts.high, stats.signalsCounts.medium, stats.signalsCounts.low],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(234, 179, 8)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Signal Distribution</h3>
      <div style={{ height: '300px' }} className="flex items-center justify-center">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.totalListings.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Active Listings</p>
        </div>
      </div>
    </div>
  );
}
