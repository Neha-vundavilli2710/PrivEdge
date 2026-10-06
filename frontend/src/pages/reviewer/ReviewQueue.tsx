import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useApi } from '../../hooks/useApi';
import { ReviewItem } from '../../api/types';
import { timeAgo } from '../../utils/time';

const riskColor = (r: string) => r === 'Critical' ? 'var(--error)' : r === 'High' ? 'var(--human-color)' : 'var(--warning)';
const riskBg = (r: string) => r === 'Critical' ? 'var(--error-light)' : r === 'High' ? 'var(--human-light)' : 'var(--warning-light)';
const statusBadge = (s: string) => s === 'In Review' ? 'badge-cloud' : 'badge-warning';

export default function ReviewQueue() {
  const { data } = useApi<ReviewItem[]>('/review/pending');
  const allItems = data ?? [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = allItems.filter(i =>
    i.query.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'All' || (filter === 'High Risk' && i.risk === 'High') || (filter === 'Critical' && i.risk === 'Critical') || (filter === 'Pending' && i.status === 'Pending') || (filter === 'In Review' && i.status === 'In Review'))
  );

  return (
    <Layout breadcrumb={[{ label: 'Reviewer', to: '/reviewer/dashboard' }, { label: 'Review Queue' }]}>
      <div className="flex flex-col gap-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Review Queue</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>High-risk queries awaiting human expertise review.</p>
          </div>
          <span className="badge badge-warning" style={{ fontSize: 14, padding: '6px 14px' }}>{allItems.filter(i => i.status === 'Pending').length} Pending</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="input-field pl-9" placeholder="Search queries..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
            {['All', 'High Risk', 'Critical', 'Pending', 'In Review'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? 'active' : ''}`} style={{ fontSize: 12 }}>{f}</button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Query</th>
                  <th>Risk</th>
                  <th>Sensitivity</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No matching reviews.</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{r.code}</span></td>
                    <td>
                      <div className="font-500 text-sm" style={{ fontWeight: 500, color: 'var(--foreground)', maxWidth: 320 }}>{r.query}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: riskBg(r.risk), color: riskColor(r.risk) }}>{r.risk}</span>
                    </td>
                    <td><span className="badge badge-warning">{r.sensitivity}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(r.created_at)}</span></td>
                    <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td>
                      <Link to={`/reviewer/review/${r.id}`} className="btn-primary py-1.5 px-3" style={{ fontSize: 12, background: 'var(--human-color)' }}>Review</Link>
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
