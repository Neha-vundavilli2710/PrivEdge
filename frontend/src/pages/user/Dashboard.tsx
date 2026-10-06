import { Link } from 'react-router-dom';
import { MessageSquare, BarChart2, BookOpen, Cpu, Cloud, UserCheck, TrendingUp, Clock, ArrowRight, Zap } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import RouteBadge from '../../components/shared/RouteBadge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApi } from '../../hooks/useApi';
import { useApp } from '../../contexts/AppContext';
import { timeAgo } from '../../utils/time';
import { UserStats, EMPTY_USER_STATS, routingPie, distPct } from '../../api/types';

export default function UserDashboard() {
  const { userName } = useApp();
  const { data, error } = useApi<UserStats>('/dashboard/statistics');
  const st = data ?? EMPTY_USER_STATS;
  const routingData = routingPie(st.pct);
  const recent = st.recent;
  return (
    <Layout title="Dashboard" subtitle="Monitor your AI activity and privacy-aware routing.">
      <div className="flex flex-col gap-6 max-w-7xl">
        {/* Welcome */}
        <div className="rounded-2xl p-6 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Zap size={24} color="white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">Welcome back, {userName.split(' ')[0]}!</h2>
            <p className="text-white/75 text-sm mt-0.5">Monitor your AI activity and privacy-aware routing. {st.pending_reviews > 0 ? `You have ${st.pending_reviews} request(s) waiting for human review.` : 'No requests are waiting for review.'}</p>
          </div>
          <Link to="/user/chatbot" className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white font-semibold text-sm" style={{ color: '#2563EB' }}>
            New Chat <ArrowRight size={15} />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Queries" value={String(st.total)} icon={<MessageSquare size={20} />} />
          <StatCard title="Edge AI Queries" value={String(st.counts.edge)} icon={<Cpu size={20} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" subtitle={`${st.pct.edge}% of total`} />
          <StatCard title="Cloud AI Queries" value={String(st.counts.cloud)} icon={<Cloud size={20} />} iconColor="var(--cloud-color)" iconBg="var(--cloud-light)" subtitle={`${st.pct.cloud}% of total`} />
          <StatCard title="Human Reviews" value={String(st.counts.human)} icon={<UserCheck size={20} />} iconColor="var(--human-color)" iconBg="var(--human-light)" subtitle={`${st.pct.human}% of total`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Routing Summary */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Routing Summary</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={routingData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {routingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {routingData.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>{name}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Overview */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Privacy Overview</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Low Privacy Risk', pct: distPct(st.privacy_distribution, 'Low'), color: 'var(--edge-color)' },
                { label: 'Medium Privacy Risk', pct: distPct(st.privacy_distribution, 'Medium'), color: 'var(--human-color)' },
                { label: 'High Privacy Risk', pct: distPct(st.privacy_distribution, 'High'), color: 'var(--error)' },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: 'var(--foreground)' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--muted)' }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: 'var(--edge-color)' }} />
                <span className="text-xs font-500" style={{ fontWeight: 500, color: 'var(--muted-foreground)' }}>{st.pct.edge}% of your queries were processed locally on Edge AI.</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {[
                { to: '/user/chatbot', icon: MessageSquare, label: 'Start New Conversation', color: '#2563EB', bg: '#DBEAFE' },
                { to: '/user/conversations', icon: BarChart2, label: 'View Conversations', color: '#7C3AED', bg: '#EDE9FE' },
                { to: '/user/knowledge-base', icon: BookOpen, label: 'Browse Knowledge Base', color: '#0891B2', bg: '#CFFAFE' },
                { to: '/user/insights', icon: TrendingUp, label: 'View Insights', color: '#16A34A', bg: '#DCFCE7' },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity" style={{ background: 'var(--muted)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{label}</span>
                  <ArrowRight size={14} className="ml-auto" style={{ color: 'var(--muted-foreground)' }} />
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
              <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Avg response time: <strong style={{ color: 'var(--foreground)' }}>{st.avg_processing_time ? `${st.avg_processing_time}s` : '—'}</strong></span>
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>Recent Conversations</h3>
            <Link to="/user/conversations" className="text-sm font-500 flex items-center gap-1" style={{ color: 'var(--primary)', fontWeight: 500 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Conversation</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={4} className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{error || 'No conversations yet — start one from the AI Assistant.'}</td></tr>}
                {recent.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{c.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.preview.slice(0, 90)}</div>
                    </td>
                    <td><RouteBadge route={c.route} size="sm" /></td>
                    <td><span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(c.updated_at)}</span></td>
                    <td>
                      <Link to="/user/chatbot" className="btn-ghost py-1.5 px-3 text-xs">Open</Link>
                    </td>
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
