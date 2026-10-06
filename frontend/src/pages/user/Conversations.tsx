import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { fmtDate } from '../../utils/time';
import { ConvSummary } from '../../api/types';
import { Search, Trash2, ExternalLink, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import RouteBadge, { Route } from '../../components/shared/RouteBadge';

const filters = ['All', 'Edge AI', 'Cloud AI', 'Human Review'];

export default function Conversations() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(() => api.get<ConvSummary[]>('/conversations').then(setConvs).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const routeOf: Record<string, Route> = { 'Edge AI': 'edge', 'Cloud AI': 'cloud', 'Human Review': 'human' };
  const filtered = convs.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) && (activeFilter === 'All' || c.route === routeOf[activeFilter]));

  async function remove(id: number) {
    if (!window.confirm('Delete this conversation and its data? This cannot be undone.')) return;
    try { await api.del(`/conversations/${id}`); setConvs(cs => cs.filter(x => x.id !== id)); } catch (e: any) { setError(e.message); }
  }

  const statusBadge = (s: string) => {
    if (s === 'Completed') return <span className="badge badge-success">{s}</span>;
    if (s === 'Under Review') return <span className="badge badge-warning">{s}</span>;
    if (s === 'Reviewed') return <span className="badge badge-info">{s}</span>;
    if (s === 'Error') return <span className="badge badge-error">{s}</span>;
    return <span className="badge badge-neutral">{s}</span>;
  };

  return (
    <Layout breadcrumb={[{ label: 'Dashboard', to: '/user/dashboard' }, { label: 'Conversations' }]}>
      <div className="flex flex-col gap-5 max-w-6xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Conversations</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Browse and manage your AI conversation history.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="input-field pl-9" placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
            {filters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} className={`tab ${activeFilter === f ? 'active' : ''}`} style={{ fontSize: 13 }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Conversation</th>
                  <th>Route</th>
                  <th>Messages</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>{error || 'No conversations found'}</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{c.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.preview.slice(0, 100)}</div>
                    </td>
                    <td><RouteBadge route={c.route} size="sm" /></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{c.msgs} msgs</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{fmtDate(c.updated_at)}</span></td>
                    <td>{statusBadge(c.status)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/user/chatbot?c=${c.id}`} className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12 }}>
                          <ExternalLink size={13} />
                        </Link>
                        <button onClick={() => remove(c.id)} className="btn-ghost py-1.5 px-2.5" style={{ color: 'var(--error)', fontSize: 12 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
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
