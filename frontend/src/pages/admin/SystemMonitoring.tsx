import Layout from '../../components/layout/Layout';
import { useApi } from '../../hooks/useApi';
import { MonitoringData } from '../../api/types';
import { timeAgo } from '../../utils/time';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'Operational') return <CheckCircle size={18} style={{ color: 'var(--edge-color)' }} />;
  if (status === 'Warning') return <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />;
  return <XCircle size={18} style={{ color: 'var(--error)' }} />;
};

const typeColor = (t: string) => t === 'error' ? 'var(--error)' : t === 'warning' ? 'var(--warning)' : 'var(--primary)';

export default function SystemMonitoring() {
  const { data, reload } = useApi<MonitoringData>('/admin/monitoring');
  const services = data?.services ?? [];
  const timeline = data?.timeline ?? [];
  const degraded = services.filter(s => s.status !== 'Operational');
  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'System Monitoring' }]}>
      <div className="flex flex-col gap-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>System Monitoring</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Real-time health and status of all PrivEdge services.</p>
          </div>
          <button className="btn-secondary gap-2" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Overall status */}
        {degraded.length > 0 ? (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <div>
              <span className="font-semibold text-sm" style={{ color: 'var(--warning)' }}>Partial Degradation — </span>
              <span className="text-sm" style={{ color: 'var(--warning)' }}>{degraded.map(s => s.name).join(', ')} not fully operational. All other services operational.</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--edge-light)', border: '1px solid var(--edge-color)' }}>
            <CheckCircle size={18} style={{ color: 'var(--edge-color)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--edge-color)' }}>All services operational.</span>
          </div>
        )}

        {/* Service cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.name} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{s.name}</div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.detail}</div>
                  </div>
                </div>
                <StatusIcon status={s.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className={`badge ${s.status === 'Operational' ? 'badge-success' : s.status === 'Warning' ? 'badge-warning' : 'badge-error'}`}>{s.status}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>{s.responseTime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Timeline */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>System Activity Timeline</h3>
          <div className="flex flex-col gap-3">
            {timeline.length === 0 && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No recent activity.</div>}
            {timeline.map(({ time, type, msg }) => (
              <div key={msg} className="flex items-start gap-3">
                <span className="font-mono text-xs pt-0.5 flex-shrink-0" style={{ color: 'var(--muted-foreground)', minWidth: 72 }}>{timeAgo(time)}</span>
                <div className="flex-1 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: typeColor(type) }} />
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{msg}</span>
                </div>
                <span className="badge flex-shrink-0" style={{ fontSize: 10, background: typeColor(type) + '20', color: typeColor(type) }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
