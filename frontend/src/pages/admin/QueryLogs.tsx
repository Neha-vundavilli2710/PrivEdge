import { useState } from 'react';
import { Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import RouteBadge, { Route } from '../../components/shared/RouteBadge';
import { useApi } from '../../hooks/useApi';
import { LogRow } from '../../api/types';
import { fmtDateTime } from '../../utils/time';

const levelColor = (v: string) => v === 'High' ? 'var(--error)' : v === 'Medium' ? 'var(--warning)' : 'var(--edge-color)';

export default function QueryLogs() {
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('All');
  const { data } = useApi<LogRow[]>(`/admin/logs?route=${routeFilter === 'All' ? '' : routeFilter}`, [routeFilter]);
  const logs = data ?? [];
  const filtered = logs.filter(l => l.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Query Logs' }]}>
      <div className="flex flex-col gap-5 max-w-7xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Query Logs</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Detailed log of all processed queries and routing decisions.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="input-field pl-9" placeholder="Search by ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-auto" style={{ minWidth: 140 }} value={routeFilter} onChange={e => setRouteFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="edge">Edge AI</option>
            <option value="cloud">Cloud AI</option>
            <option value="human">Human Review</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Query ID</th>
                  <th>Timestamp</th>
                  <th>Privacy</th>
                  <th>Sensitivity</th>
                  <th>Complexity</th>
                  <th>Risk</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Router</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={10} className="text-sm p-4" style={{ color: 'var(--muted-foreground)' }}>No matching queries.</td></tr>}
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td><span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{l.id}</span></td>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{fmtDateTime(l.ts)}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: levelColor(l.privacy) }}>{l.privacy}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: levelColor(l.sensitivity) }}>{l.sensitivity}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: levelColor(l.complexity) }}>{l.complexity}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: levelColor(l.risk) }}>{l.risk}</span></td>
                    <td><RouteBadge route={l.route as Route} size="sm" /></td>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{l.ms ? `${l.ms}ms` : '—'}</span></td>
                    <td>
                      <span className={`badge ${l.status === 'Completed' ? 'badge-success' : l.status === 'Pending Review' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 11 }}>
                        {l.status}
                      </span>
                    </td>
                    <td><span className="text-xs" style={{ color: 'var(--muted-foreground)' }} title={l.reason}>{l.router}</span></td>
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
