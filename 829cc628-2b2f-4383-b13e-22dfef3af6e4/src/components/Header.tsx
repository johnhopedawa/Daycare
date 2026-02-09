import React from 'react';
import { LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';
export function Header() {
  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 p-2 rounded-full">
              <User className="w-6 h-6 text-teal-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] tracking-widest text-gray-400 font-semibold uppercase">
                Parent Portal
              </span>
              <span className="text-3xl font-script text-teal-400 leading-none pt-1">
                LittleSparrows
              </span>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-sm text-gray-500">
              Hi, <span className="font-semibold text-gray-800">Test</span>
            </div>

            <motion.button
              whileHover={{
                scale: 1.02
              }}
              whileTap={{
                scale: 0.98
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 border border-teal-200 rounded-full hover:bg-teal-50 transition-colors">

              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>);

}