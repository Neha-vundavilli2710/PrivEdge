import { useState } from 'react';
import { api } from '../../api/client';
import { useApp, AuthUser } from '../../contexts/AppContext';
import { useApi } from '../../hooks/useApi';
import { UserStats, EMPTY_USER_STATS } from '../../api/types';
import { fmtDate, timeAgo } from '../../utils/time';
import Layout from '../../components/layout/Layout';
import { Edit2, MessageSquare, Cpu, Cloud, UserCheck, Calendar } from 'lucide-react';

export default function UserProfile() {
  const { user, setUser } = useApp();
  const { data } = useApi<UserStats>('/dashboard/statistics');
  const st = data ?? EMPTY_USER_STATS;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [msg, setMsg] = useState('');
  const initials = (user?.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  async function save() {
    try { setUser(await api.patch<AuthUser>('/auth/me', { name, email })); setEditing(false); setMsg(''); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <Layout breadcrumb={[{ label: 'Dashboard', to: '/user/dashboard' }, { label: 'Profile' }]}>
      <div className="flex flex-col gap-5 max-w-3xl">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold" style={{ fontSize: 22, color: 'var(--foreground)' }}>{user?.name}</h2>
                  <p style={{ color: 'var(--muted-foreground)' }}>{user?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-info capitalize">{user?.role}</span>
                    <span className="badge badge-success">Active</span>
                  </div>
                </div>
                <button onClick={() => setEditing(!editing)} className="btn-secondary gap-2">
                  <Edit2 size={14} /> Edit Profile
                </button>
              </div>
              {editing && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-600 mb-1" style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>Full Name</label>
                    <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-600 mb-1" style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>Email</label>
                    <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button className="btn-primary" onClick={save}>Save Changes</button>{msg && <span className="text-sm self-center" style={{ color: 'var(--error)' }}>{msg}</span>}
                    <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: 'Total Queries', value: String(st.total), color: '#2563EB', bg: '#DBEAFE' },
            { icon: Cpu, label: 'Edge AI', value: String(st.counts.edge), color: '#16A34A', bg: '#DCFCE7' },
            { icon: Cloud, label: 'Cloud AI', value: String(st.counts.cloud), color: '#2563EB', bg: '#DBEAFE' },
            { icon: UserCheck, label: 'Human Reviews', value: String(st.counts.human), color: '#F59E0B', bg: '#FEF3C7' },
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

        {/* Account Info */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Account ID', value: `USR-${String(user?.id ?? 0).padStart(3, '0')}` },
              { label: 'Role', value: (user?.role ?? '').replace(/^./, c => c.toUpperCase()) },
              { label: 'Member Since', value: fmtDate(user?.created_at) },
              { label: 'Conversations', value: String(st.conversations) },
              { label: 'Status', value: user?.is_active ? 'Active' : 'Inactive' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs font-600 mb-1" style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>{label}</div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4" style={{ fontSize: 16, color: 'var(--foreground)' }}>Recent Activity</h3>
          <div className="flex flex-col gap-3">
            {st.recent.length === 0 && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No activity yet.</div>}
            {st.recent.map(c => ({ action: `Conversation: "${c.title}"`, time: timeAgo(c.updated_at), type: c.route === 'human' ? 'review' : 'chat' })).map(({ action, time, type }) => (
              <div key={action} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: type === 'review' ? 'var(--human-color)' : type === 'chat' ? 'var(--edge-color)' : 'var(--primary)' }} />
                <div>
                  <div className="text-sm" style={{ color: 'var(--foreground)' }}>{action}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
