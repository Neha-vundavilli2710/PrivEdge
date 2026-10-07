import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Shield, Sun, Moon, Cpu, Cloud, UserCheck, Lock, Route, BookOpen, ArrowRight, CheckCircle, ChevronRight, Zap, Globe, Eye } from 'lucide-react';

function NavBar() {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-16" style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
          <Shield size={16} color="white" />
        </div>
        <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>PrivEdge</span>
      </div>
      <div className="hidden md:flex items-center gap-1">
        {['Features', 'How It Works', 'Security', 'Contact'].map(item => (
          <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="px-4 py-2 rounded-lg text-sm font-500 hover:bg-[var(--muted)] transition-colors" style={{ fontWeight: 500, color: 'var(--muted-foreground)' }}>{item}</a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          {theme === 'light' ? <Moon size={17} style={{ color: 'var(--muted-foreground)' }} /> : <Sun size={17} style={{ color: 'var(--muted-foreground)' }} />}
        </button>
        <Link to="/login" className="btn-ghost hidden sm:flex" style={{ color: 'var(--foreground)' }}>Login</Link>
        <Link to="/register" className="btn-primary">Register</Link>
      </div>
    </nav>
  );
}

function ArchDiagram() {
  return (
    <div className="relative flex flex-col items-center gap-0 select-none">
      {/* User */}
      <div className="flex flex-col items-center gap-1">
        <div className="px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-md" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', minWidth: 160, textAlign: 'center' }}>User Query</div>
        <div className="w-0.5 h-5" style={{ background: 'linear-gradient(to bottom, #7C3AED, #2563EB)' }} />
      </div>
      {/* Analyzer */}
      <div className="flex flex-col items-center gap-1">
        <div className="px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-md" style={{ background: 'linear-gradient(135deg, #1D4ED8, #6D28D9)', minWidth: 200, textAlign: 'center' }}>PrivEdge Analyzer</div>
        <div className="w-0.5 h-5" style={{ background: '#2563EB' }} />
      </div>
      {/* Router */}
      <div className="flex flex-col items-center gap-1">
        <div className="px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-md" style={{ background: '#1D4ED8', minWidth: 200, textAlign: 'center' }}>Intelligent Router</div>
        <div className="w-0.5 h-5" style={{ background: '#1D4ED8' }} />
      </div>
      {/* Three paths */}
      <div className="flex items-start justify-center gap-4">
        {[
          { label: 'Edge AI', sub: 'Local · Private · Fast', icon: Cpu, bg: '#16A34A', light: '#DCFCE7', text: '#166534', arrow: 'left' },
          { label: 'Cloud AI', sub: 'Powerful · RAG', icon: Cloud, bg: '#2563EB', light: '#DBEAFE', text: '#1E40AF', arrow: 'down' },
          { label: 'Human Expertise', sub: 'Review · High-risk', icon: UserCheck, bg: '#F59E0B', light: '#FEF3C7', text: '#92400E', arrow: 'right' },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1">
            <div className="w-0.5 h-5" style={{ background: item.bg }} />
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 shadow-sm" style={{ borderColor: item.bg, background: item.light, minWidth: 128, textAlign: 'center' }}>
              <item.icon size={20} style={{ color: item.bg }} />
              <div className="font-semibold text-xs" style={{ color: item.text }}>{item.label}</div>
              <div className="text-xs" style={{ color: item.text, opacity: 0.8 }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Response validation */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <div className="w-0.5 h-5" style={{ background: '#2563EB' }} />
        <div className="px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-md" style={{ background: 'linear-gradient(135deg, #1D4ED8, #6D28D9)', minWidth: 200, textAlign: 'center' }}>Response Validation</div>
        <div className="w-0.5 h-5" style={{ background: 'linear-gradient(to bottom, #2563EB, #7C3AED)' }} />
        <div className="px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-md" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', minWidth: 160, textAlign: 'center' }}>User Response</div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div style={{ background: 'var(--background)' }}>
      <NavBar />

      {/* Hero */}
      <section className="px-6 py-20 md:py-28" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-600 mb-6" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
              <Zap size={12} />
              Privacy-Aware Edge–Cloud AI
            </div>
            <h1 className="font-bold leading-tight mb-6" style={{ fontSize: 52, color: 'var(--foreground)', lineHeight: 1.1 }}>
              Smarter AI.<br />
              <span style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Safer Conversations.</span>
            </h1>
            <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--muted-foreground)', maxWidth: 480 }}>
              PrivEdge analyzes every query and intelligently routes it between Edge AI, Cloud AI, and Human Expertise based on privacy, sensitivity, complexity, risk, and latency.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary" style={{ fontSize: 15, padding: '11px 24px' }}>
                Get Started <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 15, padding: '11px 24px' }}>
                Learn More
              </a>
            </div>
            <div className="flex flex-wrap gap-4 mt-8">
              {['Privacy First', 'Intelligent Routing', 'Human Oversight'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--edge-color)' }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <ArchDiagram />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20" style={{ background: 'var(--secondary)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="text-center mb-14">
            <h2 className="font-bold mb-4" style={{ fontSize: 36, color: 'var(--foreground)' }}>Built for intelligent and privacy-aware AI</h2>
            <p style={{ color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>Every feature designed to keep your data private and your AI responses accurate.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Shield, color: '#7C3AED', bg: '#EDE9FE', title: 'Privacy First', desc: 'Privacy-aware query processing and local AI capabilities keep sensitive data on-device.' },
              { icon: Route, color: '#2563EB', bg: '#DBEAFE', title: 'Intelligent Routing', desc: 'Automatically select the optimal processing path based on real-time analysis.' },
              { icon: BookOpen, color: '#0891B2', bg: '#CFFAFE', title: 'RAG-Powered', desc: 'Retrieve relevant knowledge to improve AI responses with accurate context.' },
              { icon: Lock, color: '#16A34A', bg: '#DCFCE7', title: 'Secure by Design', desc: 'Authentication, authorization, encryption, masking and comprehensive audit logging.' },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ fontSize: 16, color: 'var(--foreground)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="text-center mb-14">
            <h2 className="font-bold mb-4" style={{ fontSize: 36, color: 'var(--foreground)' }}>How PrivEdge Works</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>Four steps from query to safe, intelligent response.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-0 relative">
            <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(to right, #2563EB, #7C3AED, #2563EB)', margin: '0 80px' }} />
            {[
              { step: '01', title: 'Ask', desc: 'User submits a query through the secure PrivEdge interface.', icon: MessageIcon },
              { step: '02', title: 'Analyze', desc: 'PrivEdge evaluates privacy, sensitivity, complexity, and risk.', icon: AnalyzeIcon },
              { step: '03', title: 'Route', desc: 'The intelligent router chooses Edge AI, Cloud AI, or Human Expertise.', icon: RouteIcon },
              { step: '04', title: 'Respond', desc: 'The system validates and returns a safe, accurate response.', icon: RespondIcon },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="flex flex-col items-center text-center px-6 relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative z-10" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
                  <span className="text-xl font-bold text-white">{step}</span>
                </div>
                <h3 className="font-bold mb-2" style={{ fontSize: 20, color: 'var(--foreground)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
                {step === '03' && (
                  <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    <span className="badge badge-edge" style={{ fontSize: 11 }}>Edge AI</span>
                    <span className="badge badge-cloud" style={{ fontSize: 11 }}>Cloud AI</span>
                    <span className="badge badge-human" style={{ fontSize: 11 }}>Human</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="px-6 py-20" style={{ background: 'var(--secondary)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="text-center mb-14">
            <h2 className="font-bold mb-4" style={{ fontSize: 36, color: 'var(--foreground)' }}>Security at Every Step</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>Enterprise-grade security woven into every layer of PrivEdge.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Eye, title: 'Privacy-Aware Processing', desc: 'Sensitive data never leaves the edge when privacy demands it.', color: '#7C3AED', bg: '#EDE9FE' },
              { icon: Shield, title: 'Data Masking', desc: 'Personally identifiable information is masked before cloud processing.', color: '#2563EB', bg: '#DBEAFE' },
              { icon: Lock, title: 'Secure Authentication', desc: 'Secure authentication, role-based access control, and idle session management.', color: '#16A34A', bg: '#DCFCE7' },
              { icon: UserCheck, title: 'Role-Based Authorization', desc: 'Fine-grained access controls for users, reviewers, and admins.', color: '#F59E0B', bg: '#FEF3C7' },
              { icon: Globe, title: 'Encryption', desc: 'End-to-end encryption for all data in transit and at rest.', color: '#0891B2', bg: '#CFFAFE' },
              { icon: CheckCircle, title: 'Audit Logging', desc: 'Complete audit trail of all queries, routing decisions, and reviews.', color: '#DC2626', bg: '#FEE2E2' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ fontSize: 15, color: 'var(--foreground)' }}>{title}</h3>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 py-20">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="text-center mb-10">
            <h2 className="font-bold mb-3" style={{ fontSize: 36, color: 'var(--foreground)' }}>Have questions about PrivEdge?</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>We'd love to hear from you.</p>
          </div>
          <div className="card p-8 text-center">
  <h3
    className="text-lg font-semibold mb-2"
    style={{ color: 'var(--foreground)' }}
  >
    Have questions about PrivEdge?
  </h3>

  <p
    className="text-sm"
    style={{ color: 'var(--muted-foreground)' }}
  >
    Explore the platform or sign in to start using privacy-aware AI.
  </p>
</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
            <Shield size={14} color="white" />
          </div>
          <span className="font-bold" style={{ color: 'var(--foreground)' }}>PrivEdge</span>
        </div>
        <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>Secure Edge–Cloud Conversational AI</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>© 2026 PrivEdge. All rights reserved.</p>
      </footer>
    </div>
  );
}

function MessageIcon() { return null; }
function AnalyzeIcon() { return null; }
function RouteIcon() { return null; }
function RespondIcon() { return null; }
