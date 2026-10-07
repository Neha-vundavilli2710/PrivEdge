import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, FileText, BookOpen, HelpCircle, Shield, ChevronRight, ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { docStyle, KDoc } from '../../utils/docStyle';
import { fmtDate } from '../../utils/time';
import Layout from '../../components/layout/Layout';

const categories = ['All', 'Guide', 'Support', 'Security', 'FAQ', 'Technical', 'Legal'];
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Real content search within one document: highlights every match and lets you jump between them. */
function DocumentSearch({ content }: { content: string }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matchRefs = useRef<(HTMLElement | null)[]>([]);

  const parts = useMemo(() => {
    if (!query.trim()) return [{ text: content, match: false }];
    const re = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
    return content.split(re).map(text => ({ text, match: text.toLowerCase() === query.trim().toLowerCase() }));
  }, [content, query]);
  const matchCount = parts.filter(p => p.match).length;

  useEffect(() => { setActive(0); matchRefs.current = []; }, [query]);
  useEffect(() => { if (matchCount > 0) matchRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [active, matchCount]);

  function jump(delta: number) {
    if (matchCount === 0) return;
    setActive(a => (a + delta + matchCount) % matchCount);
  }

  let matchIdx = -1;
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Search size={16} style={{ color: 'var(--muted-foreground)' }} />
        <input
          className="input-field" placeholder="Search within document..." style={{ flex: 1 }}
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') jump(e.shiftKey ? -1 : 1); }}
        />
        {query.trim() && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{matchCount > 0 ? `${active + 1}/${matchCount}` : 'No matches'}</span>
            <button onClick={() => jump(-1)} disabled={matchCount === 0} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronUp size={14} /></button>
            <button onClick={() => jump(1)} disabled={matchCount === 0} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronDown size={14} /></button>
          </div>
        )}
      </div>
      <h3 className="font-semibold mb-3" style={{ fontSize: 16, color: 'var(--foreground)' }}>Document Content</h3>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>
        {parts.map((p, i) => {
          if (!p.match) return <span key={i}>{p.text}</span>;
          matchIdx++;
          const isActive = matchIdx === active;
          return (
            <mark key={i} ref={el => { matchRefs.current[matchIdx] = el; }}
              style={{ background: isActive ? 'var(--primary)' : 'var(--human-light)', color: isActive ? 'white' : 'inherit', borderRadius: 3, padding: '0 1px' }}>
              {p.text}
            </mark>
          );
        })}
      </div>
    </>
  );
}

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const qs = new URLSearchParams({ q: search, type: cat === 'All' ? '' : cat });
  const { data: list, error } = useApi<KDoc[]>(`/knowledge?${qs}`, [search, cat]);
  const [detail, setDetail] = useState<(KDoc & { content?: string }) | null>(null);
  const filtered = (list ?? []).map(d => ({ ...d, ...docStyle(d.type), desc: d.description, updated: fmtDate(d.updated_at) }));
  async function open(id: number) { try { setDetail(await api.get<KDoc>(`/knowledge/${id}`)); } catch { /* ignore */ } }

  if (detail) {
    const ds = docStyle(detail.type);
    return (
      <Layout breadcrumb={[{ label: 'Knowledge Base', to: '/user/knowledge-base' }, { label: detail.title }]}>
        <div className="max-w-4xl">
          <button onClick={() => setDetail(null)} className="btn-ghost mb-4 pl-0">
            ← Back to Knowledge Base
          </button>
          <div className="card p-6 mb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ds.bg }}>
                <ds.icon size={22} style={{ color: ds.color }} />
              </div>
              <div className="flex-1">
                <h1 className="font-bold mb-1" style={{ fontSize: 22, color: 'var(--foreground)' }}>{detail.title}</h1>
                <p style={{ color: 'var(--muted-foreground)' }}>{detail.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Type', value: detail.type },
                { label: 'Version', value: detail.version },
                { label: 'Last Updated', value: fmtDate(detail.updated_at) },
                { label: 'Status', value: detail.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs font-600 mb-1" style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>{label}</div>
                  <div className="text-sm font-500" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <DocumentSearch content={detail.content ?? ''} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumb={[{ label: 'Dashboard', to: '/user/dashboard' }, { label: 'Knowledge Base' }]}>
      <div className="flex flex-col gap-5 max-w-6xl">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Knowledge Base</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Browse approved information used for AI retrieval and user reference.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="input-field pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)} className={`tab ${cat === c ? 'active' : ''}`} style={{ fontSize: 12 }}>{c}</button>
            ))}
          </div>
        </div>

        {error && <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => open(doc.id)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: doc.bg }}>
                  <doc.icon size={18} style={{ color: doc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--foreground)' }}>{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{doc.type}</span>
                    <span className="badge badge-success" style={{ fontSize: 11 }}>{doc.status}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>{doc.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Updated {doc.updated}</span>
                <button onClick={() => open(doc.id)} className="flex items-center gap-1 text-xs font-500" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                  View <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
