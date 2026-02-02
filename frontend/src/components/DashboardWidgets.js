import React from 'react';
import { motion } from 'framer-motion';

// --- Metric Card Component ---
export function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  delay = 0,
  themeIndex,
  variant = 'accent',
  onClick,
}) {
  if (variant === 'neutral') {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        onClick={onClick}
        className={`border bg-[var(--surface)] shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        style={{
          borderColor: 'var(--border)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
          borderRadius: 'var(--panel-radius)',
          padding: 'var(--panel-padding)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">
              {title}
            </p>
            <h3 className="text-2xl font-semibold text-stone-900">
              {value}
            </h3>
          </div>
          <div
            className="p-2 rounded-xl border bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', color: 'var(--primary-dark)' }}
          >
            <Icon size={20} />
          </div>
        </div>
      </motion.div>
    );
  }

  const themeBackground = themeIndex ? `var(--card-${themeIndex})` : null;
  const cardStyle = themeIndex
    ? { backgroundColor: themeBackground }
    : undefined;
  const cardClass = themeIndex ? '' : color;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      onClick={onClick}
      className={`p-6 rounded-3xl ${cardClass} relative overflow-hidden group transition-all duration-300 border themed-border shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)] hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.5)] ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
        ...cardStyle,
        backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 60%)',
      }}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full group-hover:scale-110 transition-transform duration-500" />

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-stone-600 font-quicksand font-medium text-sm mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-stone-800 font-quicksand">
            {value}
          </h3>
        </div>
        <div className="p-3 bg-white/40 rounded-2xl text-stone-700 backdrop-blur-sm">
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
