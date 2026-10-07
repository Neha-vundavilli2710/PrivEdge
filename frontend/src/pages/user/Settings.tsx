import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import Layout from '../../components/layout/Layout';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Lock } from 'lucide-react';

export default function UserSettings() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const roleBase = pathname.split('/')[1] || 'user';
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function changePw() {
    try { await api.post('/auth/change-password', { current_password: pw.current, new_password: pw.next }); setPwMsg({ ok: true, text: 'Password updated.' }); setPw({ current: '', next: '' }); setPwOpen(false); }
    catch (e: any) { setPwMsg({ ok: false, text: e.message }); }
  }

  return (
    <Layout breadcrumb={[{ label: 'Dashboard', to: `/${roleBase}/dashboard` }, { label: 'Settings' }]}>
      <div className="flex flex-col gap-5 max-w-2xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Settings</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your account preferences.</p>
        </div>

        {/* Appearance */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sun size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>Appearance</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map(t => (
              <button key={t} onClick={() => theme !== t && toggle()} className="p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2" style={{ borderColor: theme === t ? 'var(--primary)' : 'var(--border)', background: theme === t ? 'var(--primary-light)' : 'var(--muted)' }}>
                {t === 'light' ? <Sun size={22} style={{ color: theme === t ? 'var(--primary)' : 'var(--muted-foreground)' }} /> : <Moon size={22} style={{ color: theme === t ? 'var(--primary)' : 'var(--muted-foreground)' }} />}
                <span className="text-sm font-semibold capitalize" style={{ color: theme === t ? 'var(--primary)' : 'var(--muted-foreground)' }}>{t}</span>
              </button>
            ))}
          </div>
        </div>

        

        {/* Security */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>Security</h3>
          </div>
          <div className="flex flex-col gap-3">
            <button className="btn-secondary justify-start gap-3" onClick={() => setPwOpen(o => !o)}>
              <Lock size={15} />
              Change Password
            </button>
            {pwOpen && (
              <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--muted)' }}>
                <input className="input-field" type="password" placeholder="Current password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
                <input className="input-field" type="password" placeholder="New password (min 8 characters)" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
                <button className="btn-primary self-start" onClick={changePw} disabled={!pw.current || pw.next.length < 8}>Update Password</button>
              </div>
            )}
            {pwMsg && <div className="text-sm" style={{ color: pwMsg.ok ? 'var(--edge-color)' : 'var(--error)' }}>{pwMsg.text}</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
