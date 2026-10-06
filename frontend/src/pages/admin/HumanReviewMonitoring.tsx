import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import { ClipboardList, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ReviewMonitoring } from '../../api/types';
import { timeAgo } from '../../utils/time';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const riskColor = (r: string) => r === 'Critical' ? 'var(--error)' : r === 'High' ? 'var(--human-color)' : 'var(--warning)';

export default function HumanReviewMonitoring() {
  const { data } = useApi<ReviewMonitoring>('/admin/review-monitoring');
  const riskDist = (data?.risk_distribution ?? []).filter(r => r.name !== 'Low');
  const recentEvents = data?.recent_events ?? [];
  const rejectedToday = (data?.activity ?? []).find(a => a.day === new Date().toLocaleDateString(undefined, { weekday: 'short' }))?.rejected ?? 0;
  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Human Review Monitoring' }]}>
      <div className="flex flex-col gap-6 max-w-6xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Human Review Monitoring</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Monitor the human review workflow and queue activity.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Reviews" value={String(data?.pending ?? 0)} icon={<ClipboardList size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" />
          <StatCard title="In Review" value={String(data?.in_review ?? 0)} icon={<AlertTriangle size={18} />} iconColor="var(--warning)" iconBg="var(--warning-light)" />
          <StatCard title="Completed Today" value={String(data?.completed_today ?? 0)} icon={<CheckSquare size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" />
          <StatCard title="Avg Review Time" value={data ? `${data.avg_review_minutes} min` : "—"} icon={<Clock size={18} />} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Queue Status */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Queue Status</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Pending', value: data?.pending ?? 0, max: Math.max(20, data?.pending ?? 0), color: 'var(--human-color)' },
                { label: 'In Review', value: data?.in_review ?? 0, max: Math.max(20, data?.in_review ?? 0), color: 'var(--warning)' },
                { label: 'Completed Today', value: data?.completed_today ?? 0, max: Math.max(20, data?.completed_today ?? 0), color: 'var(--edge-color)' },
                { label: 'Rejected Today', value: rejectedToday, max: Math.max(20, rejectedToday), color: 'var(--error)' },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--foreground)' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--muted)' }}>
                    <div style={{ width: `${(value / max) * 100}%`, background: color }} className="h-2 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Risk Distribution</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDist} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {riskDist.map((_, i) => <Cell key={i} fill={['#F59E0B', '#F59E0B', '#DC2626'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Review Events */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>Recent Review Events</h3>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Review ID</th>
                  <th>Action</th>
                  <th>Reviewer</th>
                  <th>Risk</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length === 0 && <tr><td colSpan={5} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No recent review events.</td></tr>}
                {recentEvents.map(e => (
                  <tr key={e.code + e.time}>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{e.code}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--foreground)' }}>{e.action}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--foreground)' }}>{e.reviewer}</span></td>
                    <td>
                      <span className="badge" style={{ fontSize: 11, background: riskColor(e.risk) + '20', color: riskColor(e.risk) }}>{e.risk}</span>
                    </td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(e.time)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
