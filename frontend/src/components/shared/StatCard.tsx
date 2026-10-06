import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label?: string };
  subtitle?: string;
}

export default function StatCard({ title, value, icon, iconColor = 'var(--primary)', iconBg = 'var(--primary-light)', trend, subtitle }: Props) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-500" style={{ color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 6 }}>{title}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0
                ? <TrendingUp size={13} style={{ color: 'var(--success)' }} />
                : <TrendingDown size={13} style={{ color: 'var(--error)' }} />
              }
              <span className="text-xs font-500" style={{ fontWeight: 500, color: trend.value >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label || 'this week'}
              </span>
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
