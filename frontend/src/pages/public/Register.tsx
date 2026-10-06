import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Register() {
  const { register } = useApp();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/user/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--background)' }}>
      <button className="fixed top-4 right-4 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" onClick={toggle}>
        {theme === 'light' ? <Moon size={18} style={{ color: 'var(--muted-foreground)' }} /> : <Sun size={18} style={{ color: 'var(--muted-foreground)' }} />}
      </button>

      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
          <Shield size={18} color="white" />
        </div>
        <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>PrivEdge</span>
      </Link>

      <div className="card w-full p-8" style={{ maxWidth: 440 }}>
        <h1 className="font-bold text-center mb-1" style={{ fontSize: 24, color: 'var(--foreground)' }}>
          Create your PrivEdge account
        </h1>

        <p className="text-center text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
          Start using privacy-aware AI today
        </p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'var(--error-light)', color: 'var(--error)' }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              className="block text-sm font-500 mb-1.5"
              style={{ fontWeight: 500, color: 'var(--foreground)' }}
            >
              Full Name
            </label>

            <input
              className="input-field"
              placeholder="Alex Johnson"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-500 mb-1.5"
              style={{ fontWeight: 500, color: 'var(--foreground)' }}
            >
              Email address
            </label>

            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-500 mb-1.5"
              style={{ fontWeight: 500, color: 'var(--foreground)' }}
            >
              Password
            </label>

            <div className="relative">
              <input
                className="input-field pr-11"
                type={showPw ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? (
                  <EyeOff size={16} style={{ color: 'var(--muted-foreground)' }} />
                ) : (
                  <Eye size={16} style={{ color: 'var(--muted-foreground)' }} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-500 mb-1.5"
              style={{ fontWeight: 500, color: 'var(--foreground)' }}
            >
              Confirm Password
            </label>

            <input
              className="input-field"
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              className="w-4 h-4 mt-0.5 rounded"
              style={{ accentColor: 'var(--primary)' }}
              required
            />

            <label
              htmlFor="terms"
              className="text-sm leading-relaxed"
              style={{ color: 'var(--muted-foreground)' }}
            >
              I agree to the{' '}
              <a href="#" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary justify-center w-full"
            style={{ padding: '11px', fontSize: 15, marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p
          className="text-center text-sm mt-6"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--primary)', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}