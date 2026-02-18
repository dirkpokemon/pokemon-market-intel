'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DealScoreChartProps {
  deals: Array<{
    product_name: string;
    deal_score: number;
    current_price: number;
    market_avg_price?: number;
  }>;
}

export default function DealScoreChart({ deals }: DealScoreChartProps) {
  const topDeals = deals.slice(0, 10);

  const chartData = {
    labels: topDeals.map(d => d.product_name.length > 20 ? d.product_name.substring(0, 20) + '...' : d.product_name),
    datasets: [
      {
        label: 'Deal Score',
        data: topDeals.map(d => d.deal_score),
        backgroundColor: topDeals.map(d => {
          if (d.deal_score >= 80) return 'rgba(34, 197, 94, 0.8)';
          if (d.deal_score >= 70) return 'rgba(234, 179, 8, 0.8)';
          return 'rgba(59, 130, 246, 0.8)';
        }),
        borderColor: topDeals.map(d => {
          if (d.deal_score >= 80) return 'rgb(34, 197, 94)';
          if (d.deal_score >= 70) return 'rgb(234, 179, 8)';
          return 'rgb(59, 130, 246)';
        }),
        borderWidth: 2,
        borderRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: function(context: any) {
            const deal = topDeals[context.dataIndex];
            return [
              `Deal Score: ${deal.deal_score}`,
              `Current: €${deal.current_price.toFixed(2)}`,
              deal.market_avg_price ? `Average: €${deal.market_avg_price.toFixed(2)}` : ''
            ].filter(Boolean);
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value;
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Deal Score (0-100)',
          font: {
            weight: 'bold' as const,
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Top Deal Scores</h3>
      <div style={{ height: '400px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
