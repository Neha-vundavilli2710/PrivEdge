import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { AdminUser } from '../../api/types';
import { fmtDate } from '../../utils/time';
import { useApp } from '../../contexts/AppContext';

const roleBadge = (r: string) => r === 'Admin' ? 'badge-info' : r === 'Reviewer' ? 'badge-warning' : 'badge-neutral';
const statusBadge = (s: string) => s === 'Active' ? 'badge-success' : 'badge-error';

export default function UserManagement() {
  const { user: me } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const qs = new URLSearchParams({ q: search, role: roleFilter === 'All' ? '' : roleFilter, status: statusFilter === 'All' ? '' : statusFilter });
    api.get<AdminUser[]>(`/admin/users?${qs}`).then(setUsers).catch(e => setError(e.message));
  }, [search, roleFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function setRole(u: AdminUser, role: string) {
    try { await api.patch(`/admin/users/${u.id}`, { role }); load(); } catch (e: any) { setError(e.message); }
  }
  async function toggleActive(u: AdminUser) {
    try { await api.patch(`/admin/users/${u.id}`, { is_active: u.status !== 'Active' }); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'User Management' }]}>
      <div className="flex flex-col gap-5 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>User Management</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Manage user accounts, roles, and access.</p>
          </div>
          <div className="flex gap-2">
            <span className="badge badge-success">{users.filter(u => u.status === 'Active').length} Active</span>
            <span className="badge badge-neutral">{users.length} Total</span>
          </div>
        </div>

        {error && <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="input-field pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ minWidth: 130 }}>
            <option>All</option><option>User</option><option>Reviewer</option><option>Admin</option>
          </select>
          <select className="select-field w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 130 }}>
            <option>All</option><option>Active</option><option>Inactive</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Queries</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={6} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No matching users.</td></tr>}
                {users.map(u => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', flexShrink: 0 }}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-500 text-sm" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{u.name}</div>
                            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isSelf ? <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span> : (
                          <select className="select-field" style={{ fontSize: 12, padding: '4px 8px' }} value={u.role} onChange={e => setRole(u, e.target.value.toUpperCase())}>
                            <option value="User">User</option><option value="Reviewer">Reviewer</option><option value="Admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td><span className={`badge ${statusBadge(u.status)}`}>{u.status}</span></td>
                      <td><span className="text-sm" style={{ color: 'var(--foreground)' }}>{u.queries}</span></td>
                      <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{fmtDate(u.joined)}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/admin/users/${u.id}`} className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12 }}>View</Link>
                          <button disabled={isSelf} title={isSelf ? 'You cannot deactivate your own account' : undefined} onClick={() => toggleActive(u)} className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12, color: u.status === 'Active' ? 'var(--error)' : 'var(--edge-color)', opacity: isSelf ? 0.4 : 1 }}>
                            {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
