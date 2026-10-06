import { Cpu, Cloud, UserCheck, HelpCircle } from 'lucide-react';

export type Route = 'edge' | 'cloud' | 'human' | 'pending';

const config = {
  edge: { label: 'Edge AI', icon: Cpu, cls: 'badge-edge' },
  cloud: { label: 'Cloud AI', icon: Cloud, cls: 'badge-cloud' },
  human: { label: 'Human Review', icon: UserCheck, cls: 'badge-human' },
  pending: { label: 'Pending', icon: HelpCircle, cls: 'badge-warning' },
};

export default function RouteBadge({ route, size = 'md' }: { route: Route; size?: 'sm' | 'md' }) {
  const c = config[route];
  return (
    <span className={`badge ${c.cls}`} style={{ fontSize: size === 'sm' ? 11 : 12 }}>
      <c.icon size={size === 'sm' ? 10 : 12} />
      {c.label}
    </span>
  );
}
