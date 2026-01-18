import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';
import { Search, Bell, Menu } from 'lucide-react';

export function Layout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#FFF8F3] font-sans text-stone-800 selection:bg-[#FF9B85] selection:text-white">
      {/* Inject Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-quicksand { font-family: 'Quicksand', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-64 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-10">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Mobile Hamburger Menu */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-[#FFE5D9] text-stone-600 hover:text-[#FF9B85] hover:shadow-md transition-all"
              >
                <Menu size={20} />
              </button>

              <div>
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl sm:text-3xl font-bold font-quicksand text-stone-800 mb-1"
                >
                  {title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm sm:text-base text-stone-500 font-medium"
                >
                  {subtitle || currentDate}
                </motion.p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
              <div className="relative hidden md:block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 text-sm w-32 lg:w-48 xl:w-64 shadow-sm placeholder:text-stone-400"
                />
              </div>
              <button className="w-10 h-10 bg-white rounded-xl border border-[#FFE5D9] flex items-center justify-center text-stone-500 hover:text-[#FF9B85] hover:shadow-md transition-all relative flex-shrink-0">
                <Bell size={20} />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
              </button>
              <div className="w-10 h-10 bg-[#FFDCC8] rounded-xl flex items-center justify-center text-[#E07A5F] font-bold border border-white shadow-sm flex-shrink-0">
                S
              </div>
            </div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
