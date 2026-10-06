import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Cpu, Cloud, UserCheck, Shield, Lock, Bell, Settings, Sliders } from 'lucide-react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button className={`toggle ${checked ? 'active' : ''}`} onClick={onChange} />;
}

function Section({ icon: Icon, iconColor, title, children }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconColor + '20' }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <h3 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface Settings { routing: any; security: any; ai: any; notifs: any }
export default function AdminSettings() {
  const { data } = useApi<{ settings: Settings; enforced: string[]; not_enforced: string[] }>('/admin/settings');
  const [routing, setRouting] = useState({ edgeEnabled: true, cloudEnabled: true, humanEnabled: true, autoRoute: true });
  const [security, setSecurity] = useState({ mfa: false, auditLog: true, sessionTimeout: true });
  const [ai, setAi] = useState({ ragEnabled: true, contextWindow: '4096', temperature: '0.7' });
  const [notifs, setNotifs] = useState({ highRisk: true, systemAlerts: true, reviewBacklog: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const enforced = new Set(data?.enforced ?? []);

  useEffect(() => {
    if (!data) return;
    setRouting(data.settings.routing); setSecurity(data.settings.security); setAi(data.settings.ai); setNotifs(data.settings.notifs);
  }, [data]);

  async function saveAll() {
    setSaving(true); setMsg('');
    try { await api.put('/admin/settings', { routing, security, ai, notifs }); setMsg('Settings saved.'); }
    catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'System Settings' }]}>
      <div className="flex flex-col gap-5 max-w-3xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>System Settings</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Configure PrivEdge system-wide settings and policies.</p>
        </div>

        {/* Routing Configuration */}
        <Section icon={Sliders} iconColor="#2563EB" title="Routing Configuration">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'edgeEnabled', label: 'Edge AI', desc: 'Local · Private · Fast', icon: Cpu, color: '#16A34A', bg: '#DCFCE7' },
                { key: 'cloudEnabled', label: 'Cloud AI', desc: 'Powerful · RAG', icon: Cloud, color: '#2563EB', bg: '#DBEAFE' },
                { key: 'humanEnabled', label: 'Human Review', desc: 'Expert · High-risk', icon: UserCheck, color: '#F59E0B', bg: '#FEF3C7' },
              ].map(({ key, label, desc, icon: Icon, color, bg }) => (
                <div key={key} className="p-4 rounded-xl border-2 transition-all" style={{ borderColor: routing[key as keyof typeof routing] ? color : 'var(--border)', background: routing[key as keyof typeof routing] ? bg : 'var(--muted)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={18} style={{ color: routing[key as keyof typeof routing] ? color : 'var(--muted-foreground)' }} />
                    <Toggle checked={routing[key as keyof typeof routing] as boolean} onChange={() => setRouting(r => ({ ...r, [key]: !r[key as keyof typeof routing] }))} />
                  </div>
                  <div className="font-semibold text-sm" style={{ color: routing[key as keyof typeof routing] ? color : 'var(--muted-foreground)' }}>{label}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Automatic Routing</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>When off, every request is sent to Human Review regardless of its analysis (manual oversight mode)</div>
              </div>
              <Toggle checked={routing.autoRoute} onChange={() => setRouting(r => ({ ...r, autoRoute: !r.autoRoute }))} />
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section icon={Shield} iconColor="#7C3AED" title="Security">
          {[
            { key: 'mfa', label: 'Require Multi-Factor Authentication', desc: 'Not yet enforced by the backend - this toggle is a UI preference only for now' },
            { key: 'auditLog', label: 'Comprehensive Audit Logging', desc: 'Log all routing decisions, logins, and admin actions to the audit log' },
            { key: 'sessionTimeout', label: 'Idle Session Timeout', desc: 'Require re-login after a period of inactivity, independent of the token\u2019s own expiry (server-configured idle window)' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--soft-border)' }}>
              <div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
              </div>
              <Toggle checked={security[key as keyof typeof security]} onChange={() => setSecurity(s => ({ ...s, [key]: !s[key as keyof typeof security] }))} />
            </div>
          ))}
        </Section>

        {/* AI Configuration */}
        <Section icon={Settings} iconColor="#0891B2" title="AI Configuration">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>RAG Knowledge Retrieval</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Enable knowledge base retrieval for Cloud AI</div>
              </div>
              <Toggle checked={ai.ragEnabled} onChange={() => setAi(a => ({ ...a, ragEnabled: !a.ragEnabled }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Context Window (approx. tokens)</label>
                <input className="input-field" value={ai.contextWindow} onChange={e => setAi(a => ({ ...a, contextWindow: e.target.value }))} />
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Caps how much prior conversation is sent to the model (smaller = less history, faster/cheaper)</p>
              </div>
              <div>
                <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Temperature</label>
                <input className="input-field" value={ai.temperature} onChange={e => setAi(a => ({ ...a, temperature: e.target.value }))} />
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} iconColor="#F59E0B" title="System Notifications">
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>Delivered as in-app notifications (the bell icon in the top bar) to reviewers and admins - not email or push.</p>
          {[
            { key: 'highRisk', label: 'High-Risk Query Alerts', desc: 'Notify reviewers/admins when a high or critical risk query is submitted' },
            { key: 'systemAlerts', label: 'System Health Alerts', desc: 'Notify admins when Cloud AI or Edge AI fails to respond to a real request' },
            { key: 'reviewBacklog', label: 'Review Backlog Alerts', desc: `Notify reviewers/admins when the pending review queue reaches the configured threshold` },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--soft-border)' }}>
              <div>
                <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
              </div>
              <Toggle checked={notifs[key as keyof typeof notifs]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key as keyof typeof notifs] }))} />
            </div>
          ))}
        </Section>

        {msg && <div className="text-sm" style={{ color: msg === 'Settings saved.' ? 'var(--edge-color)' : 'var(--error)' }}>{msg}</div>}
        <button className="btn-primary w-full justify-center" style={{ padding: '12px' }} onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : 'Save All Settings'}</button>
      </div>
    </Layout>
  );
}
