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
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300',
  };

  const trendColorClasses = trend?.isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
  const trendIcon = trend?.isPositive ? '↑' : '↓';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColorClasses}`}>
              <span>{trendIcon}</span>
              <span>{trend.value}%</span>
              <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">{trend.label}</span>
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
