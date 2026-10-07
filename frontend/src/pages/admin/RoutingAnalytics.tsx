import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import { MessageSquare, Cpu, Cloud, UserCheck, Clock } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { AdminStats } from '../../api/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function RoutingAnalytics() {
  const { data: st } = useApi<AdminStats>('/admin/routing-analytics');
  const privacyData = st?.privacy_distribution ?? [];
  const complexityData = st?.complexity_distribution ?? [];
  const riskData = st?.risk_distribution ?? [];
  const dailyRouting = st?.daily ?? [];
  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Routing Analytics' }]}>
      <div className="flex flex-col gap-6 max-w-7xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Routing Analytics</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>System-wide routing patterns and query analysis.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Queries" value={String(st?.total ?? 0)} icon={<MessageSquare size={18} />} />
          <StatCard title="Edge AI" value={String(st?.counts.edge ?? 0)} icon={<Cpu size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" subtitle={`${st?.pct.edge ?? 0}%`} />
          <StatCard title="Cloud AI" value={String(st?.counts.cloud ?? 0)} icon={<Cloud size={18} />} iconColor="var(--cloud-color)" iconBg="var(--cloud-light)" subtitle={`${st?.pct.cloud ?? 0}%`} />
          <StatCard title="Human Review" value={String(st?.counts.human ?? 0)} icon={<UserCheck size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" subtitle={`${st?.pct.human ?? 0}%`} />
          <StatCard title="Avg Response" value={st?.avg_processing_time ? `${st.avg_processing_time}s` : "—"} icon={<Clock size={18} />} />
        </div>

        {/* Daily routing trend */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Daily Routing Volume (7 days)</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRouting} barSize={12}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="edge" name="Edge AI" fill="#16A34A" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="cloud" name="Cloud AI" fill="#2563EB" stackId="a" />
                <Bar dataKey="human" name="Human Review" fill="#F59E0B" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {[
            { title: 'Privacy Distribution', data: privacyData, colors: ['#16A34A', '#F59E0B', '#DC2626'] },
            { title: 'Complexity Distribution', data: complexityData, colors: ['#16A34A', '#2563EB', '#DC2626'] },
            { title: 'Risk Distribution', data: riskData, colors: ['#16A34A', '#F59E0B', '#DC2626'] },
          ].map(({ title, data, colors }) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold mb-4" style={{ fontSize: 15, color: 'var(--foreground)' }}>{title}</h3>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                      {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v ?? 0}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                {data.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
                      <span style={{ color: 'var(--foreground)' }}>{d.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: colors[i] }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
