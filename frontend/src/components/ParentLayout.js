import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Baby, LayoutDashboard, Users, FileText, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
  { label: 'My Children', path: '/parent/children', icon: Users },
  { label: 'Invoices', path: '/parent/invoices', icon: FileText },
  { label: 'Messages', path: '/parent/messages', icon: Mail },
];

export function ParentLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] font-sans text-stone-800">
      <header className="bg-white border-b border-[#FFE5D9] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9B85] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF9B85]/30">
              <Baby size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400 font-quicksand">
                Parent Portal
              </p>
              <h1 className="font-quicksand font-bold text-lg text-stone-800">
                Little<span className="text-[#FF9B85]">Sparrows</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.first_name && (
              <span className="text-sm text-stone-500">
                Hi, <span className="font-semibold text-stone-700">{user.first_name}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-stone-500 hover:text-red-500 hover:bg-red-50 transition-colors border border-[#FFE5D9]"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="border-t border-[#FFE5D9]">
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FFE5D9] text-[#E07A5F]'
                      : 'text-stone-500 hover:bg-[#FFF8F3] hover:text-[#E07A5F]'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-quicksand font-bold text-stone-800">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base text-stone-500 mt-1">{subtitle}</p>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
