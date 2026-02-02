import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Baby } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      // Route based on user role
      if (user.role === 'PARENT') {
        if (user.must_reset_password) {
          navigate('/parent/reset-password', { replace: true });
        } else {
          navigate('/parent/dashboard');
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FF9B85] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF9B85]/30">
              <Baby size={28} />
            </div>
            <h1 className="font-quicksand font-bold text-3xl text-stone-800 tracking-tight">
              Little<span className="text-[#FF9B85]">Steps</span>
            </h1>
          </div>
          <p className="text-stone-500 font-medium text-sm">Sign in to your account</p>
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
            <label className="block text-sm font-medium text-stone-700 mb-2 font-quicksand">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 text-sm bg-white placeholder:text-stone-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2 font-quicksand">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 text-sm bg-white placeholder:text-stone-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF9B85] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF9B85]/20 font-quicksand"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
