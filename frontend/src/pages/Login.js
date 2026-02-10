import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Baby } from 'lucide-react';
import { fetchPublicTheme } from '../utils/themeLoader';

const SAVED_STAFF_LOGIN_KEY = 'staff-portal-saved-login';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
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

  useEffect(() => {
    try {
      const rawSavedCredentials = localStorage.getItem(SAVED_STAFF_LOGIN_KEY);
      if (!rawSavedCredentials) {
        return;
      }
      const parsedCredentials = JSON.parse(rawSavedCredentials);
      if (parsedCredentials?.email && parsedCredentials?.password) {
        setEmail(parsedCredentials.email);
        setPassword(parsedCredentials.password);
        setStayLoggedIn(true);
      }
    } catch (savedCredentialsError) {
      localStorage.removeItem(SAVED_STAFF_LOGIN_KEY);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const user = await login(normalizedEmail, password);

      if (user.role === 'PARENT') {
        logout();
        setError('This login is for staff. Please use the Parent Portal.');
        return;
      }

      if (stayLoggedIn) {
        localStorage.setItem(
          SAVED_STAFF_LOGIN_KEY,
          JSON.stringify({
            email: normalizedEmail,
            password,
          })
        );
      } else {
        localStorage.removeItem(SAVED_STAFF_LOGIN_KEY);
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
        className="w-full max-w-md p-8 rounded-xl border themed-border"
        style={{
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--panel-shadow-soft)',
        }}
      >
        {/* Logo and Title */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="p-2 rounded-full flex items-center justify-center shadow-lg shrink-0"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                boxShadow: '0 10px 24px -14px rgba(var(--primary-rgb), 0.7)',
              }}
            >
              <Baby size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] tracking-widest font-semibold uppercase" style={{ color: 'var(--muted)' }}>
                Staff Portal
              </span>
              <span className="font-quicksand font-bold text-2xl sm:text-3xl tracking-tight whitespace-nowrap leading-none pt-1" style={{ color: 'var(--text)' }}>
                Little Sparrows Academy
              </span>
            </div>
          </div>
          <p className="font-medium text-sm text-center" style={{ color: 'var(--muted)' }}>Staff portal sign-in</p>
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
              name="email"
              autoComplete="username"
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
              name="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-xl border themed-border themed-ring text-sm"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <label className="text-sm inline-flex items-center gap-2 select-none cursor-pointer" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--primary)' }}
            />
            Stay logged in
          </label>

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
