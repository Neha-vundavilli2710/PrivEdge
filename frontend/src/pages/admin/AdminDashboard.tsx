import { Link } from 'react-router-dom';
import { Users, MessageSquare, Cpu, Cloud, UserCheck, ArrowRight, AlertTriangle, Activity } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import RouteBadge from '../../components/shared/RouteBadge';
import { useApi } from '../../hooks/useApi';
import { AdminStats, MonitoringData } from '../../api/types';
import { timeAgo } from '../../utils/time';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const typeColor = (t: string) => t === 'error' ? 'var(--error)' : t === 'warning' ? 'var(--warning)' : t === 'success' ? 'var(--edge-color)' : 'var(--primary)';

export default function AdminDashboard() {
  const { data } = useApi<AdminStats>('/admin/statistics');
  const { data: monitoring } = useApi<MonitoringData>('/admin/monitoring');
  const st = data;
  const systemActivity = st?.hourly_volume ?? [];
  const warnings = st?.recent_events.filter(e => e.type === 'warning').length ?? 0;
  return (
    <Layout title="Admin Dashboard" subtitle="System-wide analytics and monitoring.">
      <div className="flex flex-col gap-6 max-w-7xl">
        {/* Banner */}
        <div className="rounded-2xl p-6 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #1E1B4B, #7C3AED)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Activity size={24} color="white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">Admin Workspace</h2>
            <p className="text-white/75 text-sm">{warnings > 0 ? `${warnings} warning(s) require attention.` : 'All systems operational.'}</p>
          </div>
          <Link to="/admin/system" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white font-semibold text-sm" style={{ color: '#7C3AED' }}>
            System Status <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Users" value={String(st?.users ?? 0)} icon={<Users size={18} />} />
          <StatCard title="Total Queries" value={String(st?.total ?? 0)} icon={<MessageSquare size={18} />} />
          <StatCard title="Edge AI" value={String(st?.counts.edge ?? 0)} icon={<Cpu size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" />
          <StatCard title="Cloud AI" value={String(st?.counts.cloud ?? 0)} icon={<Cloud size={18} />} iconColor="var(--cloud-color)" iconBg="var(--cloud-light)" />
          <StatCard title="Human Reviews" value={String(st?.counts.human ?? 0)} icon={<UserCheck size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* System Activity */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>System Activity Today</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemActivity} barSize={30}>
                  <XAxis dataKey="time" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="queries" name="Queries" radius={[5, 5, 0, 0]}>
                    {systemActivity.map((_, i) => <Cell key={i} fill={`rgba(37,99,235,${0.4 + i * 0.1})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Routing Distribution */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Routing Distribution</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Edge AI', pct: st?.pct.edge ?? 0, color: 'var(--edge-color)', count: String(st?.counts.edge ?? 0) },
                { label: 'Cloud AI', pct: st?.pct.cloud ?? 0, color: 'var(--cloud-color)', count: String(st?.counts.cloud ?? 0) },
                { label: 'Human Review', pct: st?.pct.human ?? 0, color: 'var(--human-color)', count: String(st?.counts.human ?? 0) },
              ].map(({ label, pct, color, count }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: 'var(--foreground)' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ background: 'var(--muted)' }}>
                    <div style={{ width: `${pct}%`, background: color }} className="h-2.5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            {/* System health */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Service Health</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {(monitoring?.services ?? []).map(({ name, status }) => (
                  <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--muted)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: status === 'Operational' ? 'var(--edge-color)' : status === 'Warning' ? 'var(--warning)' : 'var(--error)' }} />
                    <span className="text-xs font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Recent Events</h3>
          <div className="flex flex-col gap-3">
            {(st?.recent_events ?? []).length === 0 && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No recent events.</div>}
            {(st?.recent_events ?? []).map(({ type, msg, time }) => (
              <div key={msg} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: typeColor(type) }} />
                <div className="flex-1">
                  <div className="text-sm" style={{ color: 'var(--foreground)' }}>{msg}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(time)}</div>
                </div>
                <span className="badge" style={{ fontSize: 11, background: typeColor(type) + '20', color: typeColor(type) }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
