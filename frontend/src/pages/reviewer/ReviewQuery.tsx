import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, X, Edit2, User, Shield } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import RouteBadge from '../../components/shared/RouteBadge';
import { api } from '../../api/client';
import { ReviewDetail } from '../../api/types';
import { timeAgo } from '../../utils/time';

type Action = 'approve' | 'modify' | 'reject' | null;
const LEVEL_COLOR: Record<string, string> = { Low: 'var(--edge-color)', Medium: 'var(--human-color)', High: 'var(--error)', Critical: 'var(--error)' };

export default function ReviewQuery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState<Action>(null);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<Action>(null);

  useEffect(() => {
    if (!id) return;
    api.get<ReviewDetail>(`/review/${id}`).then(d => { setDetail(d); setDraft(d.ai_draft || ''); }).catch(e => setLoadError(e.message));
    api.post(`/review/${id}/claim`).catch(() => {}); // best-effort: claim so other reviewers see "In Review"
  }, [id]);

  async function submit(act: Exclude<Action, null>, finalResponse?: string) {
    if (!id || submitting) return;
    setSubmitting(true); setSubmitError('');
    try {
      await api.post(`/review/${id}`, { action: act, comment, final_response: finalResponse });
      setResult(act);
    } catch (e: any) { setSubmitError(e.message); } finally { setSubmitting(false); }
  }

  if (loadError) return <Layout><div className="p-6 text-sm" style={{ color: 'var(--error)' }}>{loadError}</div></Layout>;
  if (!detail) return <Layout><div className="p-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</div></Layout>;

  if (result) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--edge-light)' }}>
            <Check size={28} style={{ color: 'var(--edge-color)' }} />
          </div>
          <h2 className="font-bold text-xl mb-2" style={{ color: 'var(--foreground)' }}>
            {result === 'approve' ? 'Response Approved' : result === 'modify' ? 'Response Modified' : 'Query Rejected'}
          </h2>
          <p style={{ color: 'var(--muted-foreground)' }}>The review action has been recorded and the user will see the final response in their conversation.</p>
          <button onClick={() => navigate('/reviewer/queue')} className="btn-primary mt-6">Back to Queue</button>
        </div>
      </Layout>
    );
  }

  const a = detail.analysis;
  const rows = a ? [
    { label: 'Privacy', value: a.privacy }, { label: 'Sensitivity', value: a.sensitivity }, { label: 'Complexity', value: a.complexity },
    { label: 'Risk', value: a.risk }, { label: 'Route', value: 'Human Review' }, { label: 'Latency', value: a.latency },
  ] : [];

  if (action === 'modify') {
    return (
      <Layout breadcrumb={[{ label: 'Review Queue', to: '/reviewer/queue' }, { label: 'Modify Response' }]}>
        <div className="flex flex-col gap-5 max-w-3xl">
          <h1 className="font-bold" style={{ fontSize: 26, color: 'var(--foreground)' }}>Modify Response</h1>
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>ORIGINAL AI DRAFT (masked, generated locally)</h3>
            <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
              {detail.ai_draft || <em style={{ color: 'var(--muted-foreground)' }}>No AI draft was available for this request.</em>}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>EDITABLE RESPONSE</h3>
            <textarea className="input-field" rows={8} value={draft} onChange={e => setDraft(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>REVIEWER COMMENT</h3>
            <textarea className="input-field" rows={3} placeholder="Add a note about the modifications made..." value={comment} onChange={e => setComment(e.target.value)} />
          </div>
          {submitError && <div className="text-sm" style={{ color: 'var(--error)' }}>{submitError}</div>}
          <div className="flex gap-3">
            <button className="btn-primary" disabled={submitting || !draft.trim()} onClick={() => submit('modify', draft.trim())}>
              {submitting ? 'Saving…' : 'Save & Send Response'}
            </button>
            <button className="btn-secondary" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumb={[{ label: 'Review Queue', to: '/reviewer/queue' }, { label: `Review Query ${detail.code}` }]}>
      <div className="flex flex-col gap-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="font-bold" style={{ fontSize: 26, color: 'var(--foreground)' }}>Review Query</h1>
          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>{detail.code}</span>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--human-light)', border: '1px solid var(--human-color)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--human-color)' }} />
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--human-color)' }}>High-Risk Query Requires Review</div>
            <div className="text-xs" style={{ color: 'var(--human-color)', opacity: 0.8 }}>{a?.reason || 'This query requires human judgment before a response is delivered.'}</div>
          </div>
          <RouteBadge route="human" />
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>User Query (masked)</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{detail.query_full}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Submitted by {detail.user_ref} · {timeAgo(detail.created_at)}</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} style={{ color: 'var(--primary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>PrivEdge Analysis</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rows.map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
                <div className="text-sm font-bold" style={{ color: LEVEL_COLOR[value] ?? 'var(--foreground)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>AI-GENERATED DRAFT RESPONSE (local Edge AI, not yet sent to the user)</h3>
          <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
            {detail.has_draft ? detail.ai_draft : <em style={{ color: 'var(--muted-foreground)' }}>No AI draft is available — use "Modify Response" to write the final answer yourself.</em>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>REVIEWER COMMENT (OPTIONAL)</h3>
          <textarea className="input-field" rows={3} placeholder="Add a note or justification for your decision..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>

        {submitError && <div className="text-sm" style={{ color: 'var(--error)' }}>{submitError}</div>}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => submit('approve')} disabled={submitting || !detail.has_draft} title={!detail.has_draft ? 'No AI draft to approve — use Modify instead' : undefined} className="btn-primary gap-2" style={{ background: 'var(--edge-color)' }}>
            <Check size={16} /> Approve Response
          </button>
          <button onClick={() => setAction('modify')} className="btn-secondary gap-2">
            <Edit2 size={16} /> Modify Response
          </button>
          <button onClick={() => submit('reject')} disabled={submitting} className="btn-danger gap-2">
            <X size={16} /> Reject Query
          </button>
        </div>
      </div>
    </Layout>
  );
}
