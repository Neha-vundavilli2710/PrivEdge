import { Link } from 'react-router-dom';
import { ClipboardList, CheckSquare, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/shared/StatCard';
import { useApi } from '../../hooks/useApi';
import { ReviewItem, ReviewStats, ReviewHistoryItem } from '../../api/types';
import { timeAgo } from '../../utils/time';

const riskColor = (r: string) => r === 'Critical' ? 'var(--error)' : r === 'High' ? 'var(--human-color)' : 'var(--warning)';
const riskBg = (r: string) => r === 'Critical' ? 'var(--error-light)' : r === 'High' ? 'var(--human-light)' : 'var(--warning-light)';

export default function ReviewerDashboard() {
  const { data: pending } = useApi<ReviewItem[]>('/review/pending');
  const { data: stats } = useApi<ReviewStats>('/review/stats');
  const { data: history } = useApi<ReviewHistoryItem[]>('/review/history');
  const list = (pending ?? []).slice(0, 5);
  const recentHistory = (history ?? []).slice(0, 4);
  return (
    <Layout title="Reviewer Dashboard" subtitle="Manage and review high-risk AI queries.">
      <div className="flex flex-col gap-6 max-w-7xl">
        {/* Banner */}
        <div className="rounded-2xl p-6 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <CheckSquare size={24} color="white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">Reviewer Workspace</h2>
            <p className="text-white/80 text-sm">You have {stats?.pending ?? 0} pending review(s) requiring your attention.</p>
          </div>
          <Link to="/reviewer/queue" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white font-semibold text-sm" style={{ color: '#D97706' }}>
            Review Queue <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Reviews" value={String(stats?.pending ?? 0)} icon={<ClipboardList size={18} />} iconColor="var(--human-color)" iconBg="var(--human-light)" />
          <StatCard title="Reviewed Today" value={String(stats?.completed_today ?? 0)} icon={<CheckSquare size={18} />} iconColor="var(--edge-color)" iconBg="var(--edge-light)" />
          <StatCard title="High-Risk Queries" value={String(stats?.high_risk_pending ?? 0)} icon={<AlertTriangle size={18} />} iconColor="var(--error)" iconBg="var(--error-light)" />
          <StatCard title="Avg Review Time" value={stats ? `${stats.avg_review_minutes} min` : "—"} icon={<Clock size={18} />} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>Pending Reviews</h3>
            <Link to="/reviewer/queue" className="text-sm font-500 flex items-center gap-1" style={{ color: 'var(--primary)', fontWeight: 500 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Query</th>
                  <th>Risk</th>
                  <th>Sensitivity</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No pending reviews.</td></tr>}
                {list.map(r => (
                  <tr key={r.id}>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{r.code}</span></td>
                    <td><div className="font-500 text-sm" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{r.query}</div></td>
                    <td>
                      <span className="badge" style={{ background: riskBg(r.risk), color: riskColor(r.risk) }}>{r.risk}</span>
                    </td>
                    <td><span className="badge badge-warning">{r.sensitivity}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(r.created_at)}</span></td>
                    <td>
                      <Link to={`/reviewer/review/${r.id}`} className="btn-primary py-1.5 px-3" style={{ fontSize: 12 }}>Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Recent Activity</h3>
          <div className="flex flex-col gap-3">
            {recentHistory.length === 0 && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No recent activity.</div>}
            {recentHistory.map(h => (
              <div key={h.code} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.action === 'Approved' ? 'var(--edge-color)' : h.action === 'Rejected' ? 'var(--error)' : 'var(--primary)' }} />
                <div className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>{h.action} query {h.code}</div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(h.completed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
