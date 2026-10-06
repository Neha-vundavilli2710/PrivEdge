import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';
import RouteBadge, { Route } from './RouteBadge';

interface Props {
  route: Route;
  privacy?: string;
  sensitivity?: string;
  complexity?: string;
  risk?: string;
  latency?: string;
  humanReview?: boolean;
  reason?: string;
}

const levelColor = (v?: string) => {
  if (!v) return 'var(--muted-foreground)';
  const l = v.toLowerCase();
  if (l === 'high') return 'var(--error)';
  if (l === 'medium') return 'var(--human-color)';
  if (l === 'low') return 'var(--edge-color)';
  return 'var(--muted-foreground)';
};

export default function DecisionCard({ route, privacy = 'Low', sensitivity = 'Low', complexity = 'Medium', risk = 'Low', latency = 'Low', humanReview = false, reason }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--muted)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity" onClick={() => setExpanded(e => !e)}>
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
          <Shield size={11} color="white" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide flex-1 text-left" style={{ color: 'var(--muted-foreground)' }}>PrivEdge Decision</span>
        <RouteBadge route={route} size="sm" />
        {expanded ? <ChevronUp size={14} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted-foreground)' }} />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Privacy', value: privacy },
              { label: 'Sensitivity', value: sensitivity },
              { label: 'Complexity', value: complexity },
              { label: 'Risk', value: risk },
              { label: 'Latency', value: latency },
              { label: 'Human Review', value: humanReview ? 'Yes' : 'No' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
                <div className="text-sm font-semibold" style={{ color: levelColor(value) }}>{value}</div>
              </div>
            ))}
          </div>
          {reason && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--card)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>Why this route?</div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
