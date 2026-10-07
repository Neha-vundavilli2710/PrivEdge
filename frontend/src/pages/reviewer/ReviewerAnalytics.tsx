import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import { CheckSquare, ClipboardList, Clock } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ReviewStats } from '../../api/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function ReviewerAnalytics() {
  const { data } = useApi<ReviewStats>('/review/stats');
  const activityData = data?.activity ?? [];
  const COLORS: Record<string, string> = { Approved: '#16A34A', Modified: '#2563EB', Rejected: '#DC2626' };
  const outcomeData = (data?.outcomes ?? []).map(o => ({ name: o.name, value: o.pct, color: COLORS[o.name] ?? '#64748B' }));
  const riskData = data?.risk_distribution ?? [];
  return (
    <Layout breadcrumb={[{ label: 'Reviewer', to: '/reviewer/dashboard' }, { label: 'Analytics' }]}>
      <div className="flex flex-col gap-6 max-w-7xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Reviewer Analytics</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Insights into review activity and outcomes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Reviews Completed" value={String(data?.completed ?? 0)} icon={<CheckSquare size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" />
          <StatCard title="Pending Reviews" value={String(data?.pending ?? 0)} icon={<ClipboardList size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" />
          <StatCard title="Avg Review Time" value={data ? `${data.avg_review_minutes} min` : "—"} icon={<Clock size={18} />} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Review Activity (This Week)</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} barSize={10}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="approved" name="Approved" fill="#16A34A" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="modified" name="Modified" fill="#2563EB" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="rejected" name="Rejected" fill="#DC2626" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Review Outcomes</h3>
            <div className="flex items-center gap-6">
              <div style={{ height: 180, width: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                      {outcomeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v ?? 0}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {outcomeData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{d.name}</span>
                    <span className="font-bold text-sm" style={{ color: d.color }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Risk Distribution of Reviewed Queries</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} layout="vertical" barSize={22}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {riskData.map((_, i) => <Cell key={i} fill={['#16A34A', '#F59E0B', '#F59E0B', '#DC2626'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
