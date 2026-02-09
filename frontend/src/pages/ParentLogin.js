import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchPublicTheme } from '../utils/themeLoader';

const SAVED_PARENT_LOGIN_KEY = 'parent-portal-saved-login';

function ParentLogin() {
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
    const loadParentTheme = async () => {
      try {
        const theme = await fetchPublicTheme('parent');
        if (!cancelled && theme) {
          setTheme(theme);
        }
      } catch (error) {
        // Keep current theme if public theme lookup fails.
      }
    };

    loadParentTheme();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  useEffect(() => {
    try {
      const rawSavedCredentials = localStorage.getItem(SAVED_PARENT_LOGIN_KEY);
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
      localStorage.removeItem(SAVED_PARENT_LOGIN_KEY);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const user = await login(normalizedEmail, password);

      if (user.role !== 'PARENT') {
        logout();
        setError('This login is for parents. Please use the Staff Portal.');
        return;
      }

      if (stayLoggedIn) {
        localStorage.setItem(
          SAVED_PARENT_LOGIN_KEY,
          JSON.stringify({
            email: normalizedEmail,
            password,
          })
        );
      } else {
        localStorage.removeItem(SAVED_PARENT_LOGIN_KEY);
      }

      if (user.must_reset_password) {
        navigate('/parent/reset-password', { replace: true });
      } else {
        navigate('/parent/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parent-portal-shell min-h-screen flex items-center justify-center p-4">
      <div className="parent-card w-full max-w-md p-8 rounded-xl">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="parent-icon-chip p-2 rounded-full">
              <User className="w-6 h-6" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] tracking-widest parent-text-muted font-semibold uppercase">
                Parent Portal
              </span>
              <span className="text-4xl font-script parent-brand leading-none pt-1">
                Little Sparrows Academy
              </span>
            </div>
          </div>
          <p className="parent-text-muted font-medium text-sm text-center">Parent portal sign-in</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="parent-text block text-sm font-medium mb-2">
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
              className="parent-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="parent-text block text-sm font-medium mb-2">
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
              className="parent-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          <label className="parent-text-muted text-sm inline-flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--parent-button-bg)' }}
            />
            Stay logged in
          </label>

          <button
            type="submit"
            disabled={loading}
            className="parent-button-primary w-full font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ParentLogin;
