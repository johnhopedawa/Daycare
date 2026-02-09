import React, { Children } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  MessageSquare } from
'lucide-react';
import { motion } from 'framer-motion';
const tabs = [
{
  name: 'Dashboard',
  icon: LayoutDashboard,
  active: true
},
{
  name: 'My Children',
  icon: Users,
  active: false
},
{
  name: 'Invoices',
  icon: FileText,
  active: false
},
{
  name: 'Events',
  icon: Calendar,
  active: false
},
{
  name: 'Messages',
  icon: MessageSquare,
  active: false
}];

export function Navigation() {
  return (
    <nav className="w-full bg-white border-b border-gray-100 shadow-sm relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) =>
          <button
            key={tab.name}
            className={`
                relative flex items-center gap-2 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${tab.active ? 'text-teal-600' : 'text-gray-500 hover:text-teal-500'}
              `}>

              <tab.icon
              className={`w-4 h-4 ${tab.active ? 'text-teal-400' : 'text-gray-400'}`} />

              {tab.name}
              {tab.active &&
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-t-full"
              initial={false} />

            }
            </button>
          )}
        </div>
      </div>
    </nav>);

}