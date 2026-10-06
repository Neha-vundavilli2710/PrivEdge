import { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, Bell, Search, ChevronDown, Menu, User, Settings, LogOut, Check, AlertTriangle, BookOpen, Shield, BellOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { NotificationItem } from '../../api/types';
import { timeAgo } from '../../utils/time';

const ICON: Record<string, { icon: any; color: string }> = {
  check: { icon: Check, color: 'var(--edge-color)' },
  alert: { icon: AlertTriangle, color: 'var(--human-color)' },
  shield: { icon: Shield, color: 'var(--error)' },
  book: { icon: BookOpen, color: 'var(--primary)' },
};

interface Props { title?: string; subtitle?: string; breadcrumb?: { label: string; to?: string }[]; }

export default function TopBar({ title, subtitle, breadcrumb }: Props) {
  const { theme, toggle } = useTheme();
  const { userName, userEmail, setSidebarOpen, setAuthenticated, role } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => api.get<{ items: NotificationItem[]; unread: number }>('/notifications').then(r => { setNotifications(r.items); setUnread(r.unread); }).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  function openNotifications() {
    setShowNotif(v => !v);
    if (unread > 0) api.post('/notifications/read-all').then(() => setUnread(0)).catch(() => {});
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-6 h-16" style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border)' }}>
      {/* Hamburger */}
      <button className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={() => setSidebarOpen(v => !v)}>
        <Menu size={18} style={{ color: 'var(--muted-foreground)' }} />
      </button>

      {/* Title area */}
      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span style={{ color: 'var(--muted-foreground)' }}>/</span>}
                <span style={{ color: i === breadcrumb.length - 1 ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: i === breadcrumb.length - 1 ? 600 : 400 }}>
                  {b.label}
                </span>
              </span>
            ))}
          </div>
        ) : title ? (
          <div>
            <h1 className="font-semibold truncate" style={{ fontSize: 16, color: 'var(--foreground)' }}>{title}</h1>
            {subtitle && <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</p>}
          </div>
        ) : null}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <div className="relative">
          {showSearch ? (
            <input
              autoFocus
              placeholder="Search PrivEdge..."
              onBlur={() => setShowSearch(false)}
              className="w-56 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          ) : (
            <button className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={() => setShowSearch(true)}>
              <Search size={17} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={openNotifications}>
            <Bell size={17} style={{ color: 'var(--muted-foreground)' }} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--error)' }} />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Notifications</span>
                {unread > 0 && <span className="badge badge-info text-xs">{unread} new</span>}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4 py-8" style={{ color: 'var(--muted-foreground)' }}>
                    <BellOff size={20} />
                    <span className="text-sm">No notifications yet</span>
                  </div>
                )}
                {notifications.map((n, i) => {
                  const cfg = ICON[n.icon] ?? ICON.shield;
                  return (
                    <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-[var(--muted)] transition-colors" style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--soft-border)' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: cfg.color + '20' }}>
                        <cfg.icon size={15} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{n.message}</p>
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={toggle}>
          {theme === 'light' ? <Moon size={17} style={{ color: 'var(--muted-foreground)' }} /> : <Sun size={17} style={{ color: 'var(--muted-foreground)' }} />}
        </button>

        {/* Profile */}
        <div className="relative ml-1" ref={profileRef}>
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={() => setShowProfile(v => !v)}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
              {initials}
            </div>
            <span className="text-sm font-500 hidden sm:block" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{userName.split(' ')[0]}</span>
            <ChevronDown size={13} style={{ color: 'var(--muted-foreground)' }} />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{userName}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{userEmail}</div>
                <div className="mt-1"><span className="badge badge-neutral capitalize text-xs">{role}</span></div>
              </div>
              {[
                { icon: User, label: 'Profile', action: () => { navigate(`/${role}/profile`); setShowProfile(false); } },
                { icon: Settings, label: 'Settings', action: () => { navigate(`/${role}/settings`); setShowProfile(false); } },
              ].map(item => (
                <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors" style={{ color: 'var(--foreground)' }}>
                  <item.icon size={15} style={{ color: 'var(--muted-foreground)' }} />
                  {item.label}
                </button>
              ))}
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setAuthenticated(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--error-light)] transition-colors" style={{ color: 'var(--error)' }}>
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
