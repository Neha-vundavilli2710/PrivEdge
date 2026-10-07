import Layout from '../../components/layout/Layout';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ReviewHistoryItem } from '../../api/types';
import { fmtDate } from '../../utils/time';

const actionBadge = (a: string) => {
  if (a === 'Approved') return 'badge-success';
  if (a === 'Modified') return 'badge-cloud';
  if (a === 'Rejected') return 'badge-error';
  return 'badge-neutral';
};
const riskBadge = (r: string) => r === 'Critical' ? 'badge-error' : r === 'High' ? 'badge-human' : 'badge-warning';

export default function ReviewHistory() {
  const { data } = useApi<ReviewHistoryItem[]>('/review/history');
  const history = data ?? [];
  const [search, setSearch] = useState('');
  const filtered = history.filter(h => h.query.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout breadcrumb={[{ label: 'Reviewer', to: '/reviewer/dashboard' }, { label: 'Review History' }]}>
      <div className="flex flex-col gap-5 max-w-6xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Review History</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Complete history of reviewed queries and decisions.</p>
        </div>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input className="input-field pl-9" placeholder="Search history..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Query</th>
                  <th>Reviewer</th>
                  <th>Action</th>
                  <th>Risk</th>
                  <th>Date</th>
                  <th>Review Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={8} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No reviewed queries yet.</td></tr>}
                {filtered.map(h => (
                  <tr key={h.code}>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{h.code}</span></td>
                    <td><div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)', maxWidth: 260 }}>{h.query}</div></td>
                    <td><span className="text-sm" style={{ color: 'var(--foreground)' }}>{h.reviewer}</span></td>
                    <td><span className={`badge ${actionBadge(h.action)}`}>{h.action}</span></td>
                    <td><span className={`badge ${riskBadge(h.risk)}`}>{h.risk}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{fmtDate(h.completed_at)}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{h.review_minutes != null ? `${h.review_minutes} min` : '—'}</span></td>
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
