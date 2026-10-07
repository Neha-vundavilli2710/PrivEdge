import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { timeAgo } from '../../utils/time';
import { Send, Paperclip, Cpu, Cloud, UserCheck, Sparkles, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import RouteBadge, { Route } from '../../components/shared/RouteBadge';
import DecisionCard from '../../components/shared/DecisionCard';

interface Decision {
  privacy: string; sensitivity: string; complexity: string;
  risk: string; latency: string; humanReview: boolean; reason: string;
}
interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  route?: Route;
  status?: string;
  error?: boolean;
  decision?: Decision;
  attachmentName?: string;
}
interface ConvItem { id: number; title: string; route: Route; status: string; updated_at: string }
interface ConvDetail { messages: { message_id: number; text: string; response: string; route: Route; status: string; decision: Decision | null; attachment_name?: string | null }[] }
interface ChatResponse { conversation_id: number; message_id: number; response: string; route: Route; status: string; error: boolean; decision: Decision; attachment_name?: string | null }

const ACCEPTED_FILES = '.txt,.md,.pdf';
const MAX_ATTACHMENT_MB = 3;

const suggestions = [
  'Explain how JWT authentication works',
  'How does PrivEdge decide where to route queries?',
  'What is the difference between Edge AI and Cloud AI?',
  'How does RAG improve AI responses?',
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [convList, setConvList] = useState<ConvItem[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const refreshList = useCallback(() => api.get<ConvItem[]>('/conversations').then(setConvList).catch(() => {}), []);
  useEffect(() => { refreshList(); }, [refreshList]);
  const [params] = useSearchParams();
  useEffect(() => { const c = Number(params.get('c')); if (c) openConversation(c); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const toMessages = (d: ConvDetail): Message[] => d.messages.flatMap(m => [
    { id: m.message_id * 2, role: 'user' as const, text: m.text, attachmentName: m.attachment_name ?? undefined },
    { id: m.message_id * 2 + 1, role: 'ai' as const, text: m.response, route: m.route, status: m.status, error: m.status === 'error', decision: m.decision ?? undefined },
  ]);

  async function openConversation(id: number) {
    setActiveConv(id);
    try { setMessages(toMessages(await api.get<ConvDetail>(`/conversations/${id}`))); } catch { /* ignore */ }
  }

  // While a Human Review is pending, poll so the reviewed answer appears automatically.
  const hasPending = messages.some(m => m.status === 'pending_review');
  useEffect(() => {
    if (!hasPending || activeConv === null) return;
    const t = setInterval(() => { api.get<ConvDetail>(`/conversations/${activeConv}`).then(d => { setMessages(toMessages(d)); refreshList(); }).catch(() => {}); }, 8000);
    return () => clearInterval(t);
  }, [hasPending, activeConv, refreshList]);

  async function send(text?: string) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(m => [...m, { id: Date.now(), role: 'user', text: q }]);
    setLoading(true);
    try {
      const r = await api.post<ChatResponse>('/chat', { message: q, conversation_id: activeConv });
      setActiveConv(r.conversation_id);
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: r.response, route: r.route, status: r.status, error: r.error, decision: r.decision }]);
      refreshList();
    } catch (e: any) {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: e.message || 'Something went wrong. Please try again.', error: true }]);
    } finally { setLoading(false); }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachError, setAttachError] = useState('');

  async function uploadAttachment(file: File) {
    if (loading) return;
    setAttachError('');
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setAttachError(`"${file.name}" is larger than ${MAX_ATTACHMENT_MB}MB.`);
      return;
    }
    const note = input.trim();
    setInput('');
    setMessages(m => [...m, { id: Date.now(), role: 'user', text: note || `📎 ${file.name}`, attachmentName: file.name }]);
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('message', note);
    if (activeConv !== null) form.append('conversation_id', String(activeConv));
    try {
      const r = await api.upload<ChatResponse>('/chat/attachment', form);
      setActiveConv(r.conversation_id);
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: r.response, route: r.route, status: r.status, error: r.error, decision: r.decision }]);
      refreshList();
    } catch (e: any) {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: e.message || 'Could not process that file.', error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <Layout showAssistant={false}>
      <div className="flex h-[calc(100vh-4rem-3rem)] gap-4 max-w-7xl" style={{ height: 'calc(100vh - 128px)' }}>
        {/* Conversation list */}
        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <button onClick={() => { setMessages([]); setActiveConv(null); }} className="w-full flex items-center gap-2 p-2.5 rounded-lg mb-2 font-500 text-sm transition-colors hover:opacity-80" style={{ fontWeight: 500, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white' }}>
              <Sparkles size={14} /> New Conversation
            </button>
            {convList.map(c => (
              <button key={c.id} onClick={() => openConversation(c.id)} className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors mb-0.5" style={{ background: activeConv === c.id ? 'var(--primary-light)' : undefined }}>
                <div className="font-500 text-sm truncate" style={{ fontWeight: 500, color: 'var(--foreground)' }}>{c.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <RouteBadge route={c.route} size="sm" />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(c.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main chat */}
        <div className="flex-1 flex flex-col card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
              <Sparkles size={17} color="white" />
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--foreground)' }}>PrivEdge AI</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Privacy-aware intelligent routing</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB20, #7C3AED20)' }}>
                    <Sparkles size={28} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ fontSize: 18, color: 'var(--foreground)' }}>Ask PrivEdge anything</h3>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)', maxWidth: 400 }}>Your query will be analyzed and routed to the optimal AI — Edge, Cloud, or Human Review — based on privacy and complexity.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => send(s)} className="p-3 rounded-xl text-left text-sm hover:opacity-80 transition-opacity" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                      <span>{s}</span>
                      <ChevronRight size={13} className="float-right mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="chat-message-user">
                    {msg.text}
                    {msg.attachmentName && msg.text !== `📎 ${msg.attachmentName}` && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 text-xs opacity-80" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
                        <Paperclip size={12} /> {msg.attachmentName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ maxWidth: '80%' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                        <Sparkles size={10} color="white" />
                      </div>
                      <span className="text-xs font-500" style={{ fontWeight: 500, color: 'var(--muted-foreground)' }}>PrivEdge AI</span>
                      {msg.route && <RouteBadge route={msg.route} size="sm" />}
                    </div>
                    <div className={`chat-message-ai ${msg.route ? `route-indicator-${msg.route}` : ''}`} style={msg.error ? { border: '1px solid var(--error)' } : undefined}>
                      {msg.route === 'human' && msg.status === 'pending_review' ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: 'var(--human-light)' }}>
                            <UserCheck size={16} style={{ color: 'var(--human-color)' }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--human-color)' }}>Human Review Required</span>
                          </div>
                          <p>{msg.text}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--human-color)', animationDelay: `${i * 0.3}s` }} />)}
                            </div>
                            <span className="text-xs font-500" style={{ fontWeight: 500, color: 'var(--human-color)' }}>Awaiting reviewer</span>
                          </div>
                        </div>
                      ) : <>{msg.route === 'human' && msg.status === 'reviewed' && <div className="text-xs mb-2" style={{ fontWeight: 600, color: 'var(--human-color)' }}>✓ Reviewed by a human expert</div>}<span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span></>}
                    </div>
                    {msg.decision && msg.route && (
                      <DecisionCard
                        route={msg.route!}
                        privacy={msg.decision.privacy}
                        sensitivity={msg.decision.sensitivity}
                        complexity={msg.decision.complexity}
                        risk={msg.decision.risk}
                        latency={msg.decision.latency}
                        humanReview={msg.decision.humanReview}
                        reason={msg.decision.reason}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                  <Sparkles size={10} color="white" />
                </div>
                <div className="chat-message-ai">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--muted-foreground)', animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {attachError && <div className="text-xs mb-2" style={{ color: 'var(--error)' }}>{attachError}</div>}
            <div className="flex items-end gap-3">
              <input ref={fileInputRef} type="file" accept={ACCEPTED_FILES} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ''; }} />
              <button disabled={loading} onClick={() => fileInputRef.current?.click()} title="Attach a .txt, .md, or .pdf file" className="p-2.5 rounded-xl flex-shrink-0 hover:bg-[var(--muted)] transition-colors disabled:opacity-40">
                <Paperclip size={18} style={{ color: 'var(--muted-foreground)' }} />
              </button>
              <div className="flex-1 relative">
                <textarea
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', minHeight: 44, maxHeight: 120, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}
                  placeholder="Ask PrivEdge anything..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                />
              </div>
              <button onClick={() => send()} disabled={!input.trim() || loading} className="p-2.5 rounded-xl flex-shrink-0 transition-colors" style={{ background: input.trim() ? 'var(--primary)' : 'var(--muted)', cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
                <Send size={18} color={input.trim() ? 'white' : 'var(--muted-foreground)'} />
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--muted-foreground)' }}>
              PrivEdge routes your query to Edge AI, Cloud AI, or Human Review based on privacy and complexity analysis.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
