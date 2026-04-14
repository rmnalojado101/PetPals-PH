import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant: 'pink' | 'blue' | 'green' | 'orange';
}

const variantStyles = {
  pink: {
    bg: 'stat-card-pink',
    iconBg: 'bg-pink-100',
    icon: 'text-stat-pink',
    trend: 'bg-pink-500',
  },
  blue: {
    bg: 'stat-card-blue',
    iconBg: 'bg-blue-100',
    icon: 'text-stat-blue',
    trend: 'bg-blue-500',
  },
  green: {
    bg: 'stat-card-green',
    iconBg: 'bg-green-100',
    icon: 'text-stat-green',
    trend: 'bg-green-500',
  },
  orange: {
    bg: 'stat-card-orange',
    iconBg: 'bg-orange-100',
    icon: 'text-stat-orange',
    trend: 'bg-orange-500',
  },
};

export function StatCard({ title, value, icon: Icon, trend, trendValue, variant }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="rounded-xl bg-card p-6 shadow-sm border border-border/50">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', styles.iconBg)}>
          <Icon className={cn('h-6 w-6', styles.icon)} />
        </div>
        {trendValue && (
          <div className={cn(
            'h-1 w-12 rounded-full',
            trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : styles.trend
          )} />
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
