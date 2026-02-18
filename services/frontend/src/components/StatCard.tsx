'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export default function StatCard({ title, value, subtitle, icon, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const trendColorClasses = trend?.isPositive ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend?.isPositive ? '↑' : '↓';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColorClasses}`}>
              <span>{trendIcon}</span>
              <span>{trend.value}%</span>
              <span className="text-gray-500 font-normal ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center text-2xl flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
