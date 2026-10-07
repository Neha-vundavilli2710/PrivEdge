import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Login() {
  const { login } = useApp();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const u = await login(email.trim(), password);
      navigate(`/${u.role}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      <button
        className="fixed top-4 right-4 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
        onClick={toggle}
      >
        {theme === 'light' ? (
          <Moon
            size={18}
            style={{ color: 'var(--muted-foreground)' }}
          />
        ) : (
          <Sun
            size={18}
            style={{ color: 'var(--muted-foreground)' }}
          />
        )}
      </button>

      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          }}
        >
          <Shield size={18} color="white" />
        </div>

        <span
          className="text-xl font-bold"
          style={{ color: 'var(--foreground)' }}
        >
          PrivEdge
        </span>
      </Link>

      <div
        className="card w-full p-8"
        style={{ maxWidth: 420 }}
      >
        <h1
          className="font-bold text-center mb-1"
          style={{
            fontSize: 26,
            color: 'var(--foreground)',
          }}
        >
          Welcome back
        </h1>

        <p
          className="text-center text-sm mb-8"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Sign in to your PrivEdge account
        </p>

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4"
        >
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: 'var(--error-light)',
                color: 'var(--error)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              className="block text-sm font-500 mb-1.5"
              style={{
                fontWeight: 500,
                color: 'var(--foreground)',
              }}
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
            <div className="flex justify-between items-center mb-1.5">
              <label
                className="text-sm font-500"
                style={{
                  fontWeight: 500,
                  color: 'var(--foreground)',
                }}
              >
                Password
              </label>
            </div>

            <div className="relative">
              <input
                className="input-field pr-11"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
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
                  <EyeOff
                    size={16}
                    style={{ color: 'var(--muted-foreground)' }}
                  />
                ) : (
                  <Eye
                    size={16}
                    style={{ color: 'var(--muted-foreground)' }}
                  />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary justify-center w-full"
            style={{
              padding: '11px',
              fontSize: 15,
              marginTop: 4,
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          className="text-center text-sm mt-6"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--primary)',
              fontWeight: 600,
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}