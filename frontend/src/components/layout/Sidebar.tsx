import { NavLink } from 'react-router-dom';
import { useApp, Role } from '../../contexts/AppContext';
import { Shield, Home, MessageSquare, BookOpen, BarChart2, Settings, LogOut, Users, Database, Search, Activity, ClipboardList, CheckSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';

const userNav = [
  { to: '/user/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/user/chatbot', icon: MessageSquare, label: 'AI Chatbot' },
  { to: '/user/conversations', icon: ClipboardList, label: 'Conversations' },
  { to: '/user/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/user/insights', icon: BarChart2, label: 'Insights' },
];
const reviewerNav = [
  { to: '/reviewer/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/reviewer/queue', icon: ClipboardList, label: 'Review Queue' },
  { to: '/reviewer/history', icon: CheckSquare, label: 'Review History' },
  { to: '/reviewer/analytics', icon: BarChart2, label: 'Analytics' },
];
const adminNav = [
  { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/routing', icon: Activity, label: 'Routing Analytics' },
  { to: '/admin/logs', icon: Search, label: 'Query Logs' },
  { to: '/admin/reviews', icon: CheckSquare, label: 'Human Reviews' },
  { to: '/admin/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/admin/system', icon: Database, label: 'System Monitoring' },
  { to: '/admin/settings', icon: Settings, label: 'System Settings' },
];

const navMap: Record<Role, typeof userNav> = { user: userNav, reviewer: reviewerNav, admin: adminNav };

export default function Sidebar() {
  const { role, setAuthenticated, sidebarOpen, setSidebarOpen } = useApp();
  const nav = navMap[role];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? 248 : 0,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          minWidth: sidebarOpen ? 248 : 0,
        }}
      >
        <div style={{ width: 248 }} className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--soft-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                <Shield size={16} color="white" />
              </div>
              <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>PrivEdge</span>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={16} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          </div>

          {/* Role badge */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: role === 'admin' ? 'var(--secondary-purple)' : role === 'reviewer' ? 'var(--human-color)' : 'var(--edge-color)' }} />
              <span className="text-xs font-600 capitalize" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>
                {role.charAt(0).toUpperCase() + role.slice(1)} Workspace
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-4 py-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--soft-border)' }}>
            {role === 'user' && (
              <NavLink to="/user/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Settings size={17} />
                <span>Settings</span>
              </NavLink>
            )}
            {role === 'reviewer' && (
              <NavLink to="/reviewer/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Settings size={17} />
                <span>Settings</span>
              </NavLink>
            )}
            <button
              className="sidebar-link w-full text-left"
              style={{ color: 'var(--error)' }}
              onClick={() => setAuthenticated(false)}
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
