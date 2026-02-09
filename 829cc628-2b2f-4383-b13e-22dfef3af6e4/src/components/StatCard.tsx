import React from 'react';
import { motion } from 'framer-motion';
import { BoxIcon } from 'lucide-react';
interface StatCardProps {
  label: string;
  value: string;
  icon: BoxIcon;
  delay?: number;
}
export function StatCard({
  label,
  value,
  icon: Icon,
  delay = 0
}: StatCardProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.5,
        delay
      }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-teal-600 transition-colors">
            {value}
          </h3>
        </div>
        <div className="p-3 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
          <Icon className="w-6 h-6 text-teal-400 group-hover:text-teal-600 transition-colors" />
        </div>
      </div>
    </motion.div>);

}