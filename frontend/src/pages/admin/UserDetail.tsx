import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { MessageSquare, Cpu, Cloud, UserCheck, ArrowLeft } from 'lucide-react';
import RouteBadge, { Route } from '../../components/shared/RouteBadge';
import { api } from '../../api/client';
import { fmtDate } from '../../utils/time';
import { useApp } from '../../contexts/AppContext';

interface Detail {
  id: number; code: string; name: string; email: string; role: string; status: string; joined: string; queries: number;
  counts: { edge: number; cloud: number; human: number }; conversations: number;
  recent_activity: { title: string; route: Route; updated_at: string }[];
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useApp();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  const load = () => {
  if (!id) return;
  api.get<Detail>(`/admin/users/${id}`).then(setD).catch(e => setError(e.message));
};
useEffect(() => {
  load();
}, [id]);

  async function setRole(role: string) {
    try { await api.patch(`/admin/users/${id}`, { role }); load(); } catch (e: any) { setError(e.message); }
  }
  async function toggleActive() {
    if (!d) return;
    try { await api.patch(`/admin/users/${id}`, { is_active: d.status !== 'Active' }); load(); } catch (e: any) { setError(e.message); }
  }

  if (error) return <Layout><div className="p-6 text-sm" style={{ color: 'var(--error)' }}>{error}</div></Layout>;
  if (!d) return <Layout><div className="p-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</div></Layout>;
  const isSelf = d.id === me?.id;
  const initials = d.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'User Management', to: '/admin/users' }, { label: d.name }]}>
      <div className="flex flex-col gap-5 max-w-3xl">
        <button onClick={() => navigate('/admin/users')} className="btn-ghost pl-0 -ml-2">
          <ArrowLeft size={15} /> Back to Users
        </button>

        <div className="card p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>{initials}</div>
            <div className="flex-1">
              <h2 className="font-bold" style={{ fontSize: 20, color: 'var(--foreground)' }}>{d.name}</h2>
              <p style={{ color: 'var(--muted-foreground)' }}>{d.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="badge badge-neutral">{d.role}</span>
                <span className={`badge ${d.status === 'Active' ? 'badge-success' : 'badge-error'}`}>{d.status}</span>
              </div>
            </div>
            {!isSelf && (
              <div className="flex gap-2">
                <select className="select-field" style={{ fontSize: 13 }} value={d.role} onChange={e => setRole(e.target.value.toUpperCase())}>
                  <option value="User">User</option><option value="Reviewer">Reviewer</option><option value="Admin">Admin</option>
                </select>
                <button className="btn-danger" style={{ fontSize: 13, padding: '8px 14px' }} onClick={toggleActive}>{d.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'User ID', value: d.code },
              { label: 'Joined', value: fmtDate(d.joined) },
              { label: 'Conversations', value: String(d.conversations) },
              { label: 'Status', value: d.status },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs font-600 mb-1" style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>{label}</div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: 'Total Queries', value: d.queries, color: '#2563EB', bg: '#DBEAFE' },
            { icon: Cpu, label: 'Edge AI', value: d.counts.edge, color: '#16A34A', bg: '#DCFCE7' },
            { icon: Cloud, label: 'Cloud AI', value: d.counts.cloud, color: '#2563EB', bg: '#DBEAFE' },
            { icon: UserCheck, label: 'Human Reviews', value: d.counts.human, color: '#F59E0B', bg: '#FEF3C7' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="card p-4 text-center">
              <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="font-bold text-xl" style={{ color: 'var(--foreground)' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold" style={{ fontSize: 15, color: 'var(--foreground)' }}>Recent Conversations</h3>
          </div>
          <table>
            <thead><tr><th>Title</th><th>Route</th><th>Updated</th></tr></thead>
            <tbody>
              {d.recent_activity.length === 0 && <tr><td colSpan={3} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No conversations yet.</td></tr>}
              {d.recent_activity.map((a, i) => (
                <tr key={i}>
                  <td><span className="text-sm" style={{ color: 'var(--foreground)' }}>{a.title}</span></td>
                  <td><RouteBadge route={a.route} size="sm" /></td>
                  <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{fmtDate(a.updated_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
