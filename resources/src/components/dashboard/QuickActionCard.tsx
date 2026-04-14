import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  variant: 'purple' | 'teal' | 'amber';
  path: string;
}

const variantStyles = {
  purple: 'bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700',
  teal: 'bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
};

export function QuickActionCard({ title, icon: Icon, variant, path }: QuickActionCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        'flex items-center justify-between rounded-xl p-5 text-left text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5',
        variantStyles[variant]
      )}
    >
      <span className="text-lg font-semibold">{title}</span>
      <Icon className="h-6 w-6" />
    </button>
  );
}
