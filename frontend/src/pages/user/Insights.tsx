import { useApi } from '../../hooks/useApi';
import { UserStats, EMPTY_USER_STATS, routingPie } from '../../api/types';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import { MessageSquare, Cpu, Cloud, UserCheck, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function Insights() {
  const { data } = useApi<UserStats>('/dashboard/statistics');
  const st = data ?? EMPTY_USER_STATS;
  const routingData = routingPie(st.pct);
  const weeklyData = st.daily;
  const complexityData = st.complexity_distribution;
  const responseTimeData = st.response_time_by_hour;
  return (
    <Layout breadcrumb={[{ label: 'Dashboard', to: '/user/dashboard' }, { label: 'Insights' }]}>
      <div className="flex flex-col gap-6 max-w-7xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Insights</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Analytics and patterns from your AI query history.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Queries" value={String(st.total)} icon={<MessageSquare size={18} />} />
          <StatCard title="Edge AI" value={String(st.counts.edge)} icon={<Cpu size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" />
          <StatCard title="Cloud AI" value={String(st.counts.cloud)} icon={<Cloud size={18} />} iconColor="var(--cloud-color)" iconBg="var(--cloud-light)" />
          <StatCard title="Human Reviews" value={String(st.counts.human)} icon={<UserCheck size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" />
          <StatCard title="Avg Response" value={st.avg_processing_time ? `${st.avg_processing_time}s` : "—"} icon={<Clock size={18} />} iconColor="var(--secondary-purple)" iconBg="var(--secondary-purple-light)" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Routing Distribution */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Routing Distribution</h3>
            <div className="flex items-center gap-6">
              <div style={{ height: 180, width: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={routingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                      {routingData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {routingData.map(d => (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span style={{ color: 'var(--foreground)' }}>{d.name}</span>
                      </div>
                      <span className="font-semibold" style={{ color: d.color }}>{d.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                      <div style={{ width: `${d.value}%`, background: d.color }} className="h-1.5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Weekly Query Activity</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={10}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="edge" name="Edge AI" fill="#16A34A" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="cloud" name="Cloud AI" fill="#2563EB" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="human" name="Human" fill="#F59E0B" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Complexity */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Query Complexity Distribution</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complexityData} layout="vertical" barSize={22}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {complexityData.map((_, i) => <Cell key={i} fill={['#16A34A', '#2563EB', '#F59E0B'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Response Time */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Average Response Time (24h)</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="s" />
                  <Tooltip formatter={(v: number) => [`${v}s`, 'Avg Response']} />
                  <Line type="monotone" dataKey="avg" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
