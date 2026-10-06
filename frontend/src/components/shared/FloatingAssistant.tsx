import { useState } from 'react';
import { api } from '../../api/client';
import { X, Minus, Send, Sparkles, ChevronUp } from 'lucide-react';

type State = 'closed' | 'open' | 'minimized';

const quickSuggestions = [
  'How do I use PrivEdge?',
  'How does routing work?',
  'Why was my query flagged?',
  'Explain Edge vs Cloud AI',
];

interface Msg {
  role: 'assistant' | 'user';
  text: string;
}

const initial: Msg[] = [
  {
    role: 'assistant',
    text: 'Hi! I\'m the PrivEdge Assistant. How can I help you use PrivEdge today?',
  },
];

export default function FloatingAssistant() {
  const [state, setState] = useState<State>('closed');
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [convId, setConvId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function closeAssistant() {
    setState('closed');
    setMsgs(initial);
    setInput('');
    setConvId(null);
    setBusy(false);
  }

  async function send(text?: string) {
    const t = (text || input).trim();

    if (!t || busy) return;

    setMsgs(m => [...m, { role: 'user', text: t }]);
    setInput('');
    setBusy(true);

    try {
      const r = await api.post<{
        conversation_id: number;
        response: string;
        route: string;
      }>('/chat', {
        message: t,
        conversation_id: convId,
      });

      setConvId(r.conversation_id);

      const label =
        r.route === 'edge'
          ? 'Edge AI'
          : r.route === 'cloud'
            ? 'Cloud AI'
            : 'Human Review';

      setMsgs(m => [
        ...m,
        {
          role: 'assistant',
          text: `${r.response}\n\n— Processed by: ${label}`,
        },
      ]);
    } catch (e: any) {
      setMsgs(m => [
        ...m,
        {
          role: 'assistant',
          text: e.message || 'Something went wrong.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'closed') {
    return (
      <button
        onClick={() => setState('open')}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
        }}
        aria-label="Open PrivEdge Assistant"
      >
        <Sparkles size={22} color="white" />
      </button>
    );
  }

  if (state === 'minimized') {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          minWidth: 200,
        }}
        onClick={() => setState('open')}
      >
        <Sparkles size={16} color="white" />

        <span className="text-sm font-semibold text-white flex-1">
          PrivEdge Assistant
        </span>

        <ChevronUp size={16} color="white" />
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      style={{
        width: 340,
        height: 460,
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
        }}
      >
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Sparkles size={16} color="white" />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-white">
            PrivEdge Assistant
          </div>

          <div className="text-xs text-white/70">
            Support & guidance
          </div>
        </div>

        {/* Minimize */}
        <button
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          onClick={() => setState('minimized')}
          aria-label="Minimize PrivEdge Assistant"
        >
          <Minus size={14} color="white" />
        </button>

        {/* Close */}
        <button
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          onClick={closeAssistant}
          aria-label="Close PrivEdge Assistant"
        >
          <X size={14} color="white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="flex gap-2 max-w-[85%]">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, #2563EB, #7C3AED)',
                  }}
                >
                  <Sparkles size={10} color="white" />
                </div>

                <div
                  className="text-sm leading-relaxed p-3 rounded-2xl rounded-tl-sm"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                  }}
                >
                  <span style={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </span>
                </div>
              </div>
            )}

            {m.role === 'user' && (
              <div
                className="text-sm leading-relaxed p-3 rounded-2xl rounded-tr-sm max-w-[85%]"
                style={{
                  background: '#2563EB',
                  color: 'white',
                }}
              >
                <span style={{ whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick suggestions */}
      {msgs.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {quickSuggestions.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--primary)',
                background: 'var(--primary-light)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-center gap-2 p-3 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask for help..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: 'var(--foreground)' }}
        />

        <button
          onClick={() => send()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            background: input.trim() ? '#2563EB' : 'var(--muted)',
          }}
          aria-label="Send message"
        >
          <Send
            size={14}
            color={input.trim() ? 'white' : 'var(--muted-foreground)'}
          />
        </button>
      </div>
    </div>
  );
}