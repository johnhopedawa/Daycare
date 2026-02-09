import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Baby } from 'lucide-react';
import { fetchPublicTheme } from '../utils/themeLoader';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, logout } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const hasLoadedThemeRef = useRef(false);

  useEffect(() => {
    if (hasLoadedThemeRef.current) {
      return undefined;
    }
    hasLoadedThemeRef.current = true;
    let cancelled = false;
    const loadStaffTheme = async () => {
      try {
        const theme = await fetchPublicTheme('staff');
        if (!cancelled && theme) {
          setTheme(theme);
        }
      } catch (error) {
        // Keep current theme if public theme lookup fails.
      }
    };

    loadStaffTheme();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      if (user.role === 'PARENT') {
        logout();
        setError('This login is for staff. Please use the Parent Portal.');
        return;
      }

      if (user.role === 'EDUCATOR') {
        navigate('/educator/dashboard');
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}
    >
      <div
        className="w-full max-w-md p-8 rounded-3xl border themed-border"
        style={{
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--panel-shadow-soft)',
        }}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                boxShadow: '0 10px 24px -14px rgba(var(--primary-rgb), 0.7)',
              }}
            >
              <Baby size={28} />
            </div>
            <h1 className="font-quicksand font-bold text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
              Little Sparrows <span style={{ color: 'var(--primary)' }}>Academy</span>
            </h1>
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--muted)' }}>Staff portal sign-in</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 font-quicksand" style={{ color: 'var(--text)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-xl border themed-border themed-ring text-sm"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 font-quicksand" style={{ color: 'var(--text)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-xl border themed-border themed-ring text-sm"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-quicksand"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
              boxShadow: '0 12px 26px -14px rgba(var(--primary-rgb), 0.75)',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
