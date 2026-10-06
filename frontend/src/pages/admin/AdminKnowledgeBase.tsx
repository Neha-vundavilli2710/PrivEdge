import { useEffect, useState, useCallback } from 'react';
import { Search, Upload, Edit2, Eye, Archive, X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { docStyle, KDoc } from '../../utils/docStyle';
import { fmtDate } from '../../utils/time';

const CATEGORIES = ['Guide', 'Support', 'Security', 'Technical', 'FAQ', 'Legal'];

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Guide');
  const [version, setVersion] = useState('1.0.0');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return setError('Please choose a .txt or .md file to upload.');
    setBusy(true); setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('title', title || file.name);
    form.append('doc_type', type);
    form.append('description', description);
    form.append('version', version);
    try { await api.upload('/admin/knowledge/upload', form); onDone(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold" style={{ fontSize: 18, color: 'var(--foreground)' }}>Upload Document</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-4">
          {error && <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>{error}</div>}
          <div>
            <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Document Name</label>
            <input className="input-field" placeholder="e.g. PrivEdge Security Guide v3.1" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Description</label>
            <textarea className="input-field" rows={2} placeholder="Brief description of the document..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Category</label>
              <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-500 mb-1.5" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Version</label>
              <input className="input-field" placeholder="e.g. 1.0.0" value={version} onChange={e => setVersion(e.target.value)} />
            </div>
          </div>
          <label className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:opacity-80 transition-opacity block" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{file ? file.name : 'Click to choose a file'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>.txt or .md, up to 1MB — content is screened for sensitive data before indexing</p>
            <input type="file" accept=".txt,.md" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex gap-3">
            <button className="btn-primary flex-1 justify-center" onClick={submit} disabled={busy}>{busy ? 'Uploading…' : 'Upload Document'}</button>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ doc, readOnly, onClose, onDone }: { doc: KDoc; readOnly: boolean; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: doc.title, description: doc.description, content: doc.content ?? '', version: doc.version, status: doc.status, doc_type: doc.type });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError('');
    try { await api.put(`/admin/knowledge/${doc.id}`, form); onDone(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-2xl p-6 animate-fade-in" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold" style={{ fontSize: 18, color: 'var(--foreground)' }}>{readOnly ? 'View Document' : 'Edit Document'}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-4">
          {error && <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>{error}</div>}
          <input className="input-field" disabled={readOnly} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="input-field" rows={2} disabled={readOnly} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <select className="select-field" disabled={readOnly} value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input className="input-field" disabled={readOnly} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            <select className="select-field" disabled={readOnly} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option>Published</option><option>Draft</option><option>Archived</option>
            </select>
          </div>
          <textarea className="input-field font-mono" rows={10} disabled={readOnly} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={{ fontSize: 13 }} />
          {!readOnly && (
            <div className="flex gap-3">
              <button className="btn-primary flex-1 justify-center" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminKnowledgeBase() {
  const [showUpload, setShowUpload] = useState(false);
  const [modalDoc, setModalDoc] = useState<KDoc | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<KDoc[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get<KDoc[]>('/admin/knowledge').then(setDocs).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function openFull(id: number, ro: boolean) {
    try { setReadOnly(ro); setModalDoc(await api.get<KDoc>(`/admin/knowledge/${id}`)); } catch (e: any) { setError(e.message); }
  }
  async function archive(id: number) {
    if (!window.confirm('Archive this document? It will no longer appear for users or be used for RAG.')) return;
    try { await api.del(`/admin/knowledge/${id}`); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <Layout breadcrumb={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Knowledge Base' }]}>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
      {modalDoc && <EditModal doc={modalDoc} readOnly={readOnly} onClose={() => setModalDoc(null)} onDone={() => { setModalDoc(null); load(); }} />}
      <div className="flex flex-col gap-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: 26, color: 'var(--foreground)' }}>Knowledge Base Management</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Manage documents available for RAG retrieval.</p>
          </div>
          <button className="btn-primary gap-2" onClick={() => setShowUpload(true)}>
            <Upload size={15} /> Upload Document
          </button>
        </div>

        {error && <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input className="input-field pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Document</th><th>Type</th><th>Version</th><th>Status</th><th>Last Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase())).map(doc => {
                  const ds = docStyle(doc.type);
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ds.bg }}>
                            <ds.icon size={15} style={{ color: ds.color }} />
                          </div>
                          <span className="font-500 text-sm" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{doc.title}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{doc.type}</span></td>
                      <td><span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>v{doc.version}</span></td>
                      <td><span className={`badge ${doc.status === 'Published' ? 'badge-success' : doc.status === 'Draft' ? 'badge-warning' : 'badge-neutral'}`}>{doc.status}</span></td>
                      <td><span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{fmtDate(doc.updated_at)}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12 }} onClick={() => openFull(doc.id, true)}><Eye size={13} /></button>
                          <button className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12 }} onClick={() => openFull(doc.id, false)}><Edit2 size={13} /></button>
                          <button className="btn-ghost py-1.5 px-2.5" style={{ fontSize: 12, color: 'var(--warning)' }} onClick={() => archive(doc.id)}><Archive size={13} /></button>
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
