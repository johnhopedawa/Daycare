import React from 'react';
import { motion } from 'framer-motion';

const resolveCardPalette = (themeIndex) => {
  const hasThemeIndex = Number.isInteger(themeIndex) && themeIndex > 0;
  return {
    background: hasThemeIndex ? `var(--card-${themeIndex})` : 'var(--accent)',
    text: hasThemeIndex ? `var(--card-text-${themeIndex}, var(--text))` : 'var(--on-accent)',
    border: 'rgba(var(--accent-rgb), 0.34)',
  };
};

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
  footer,
}) {
  const palette = resolveCardPalette(themeIndex);

  if (variant === 'neutral') {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        onClick={onClick}
        className={`border relative overflow-hidden transition-all duration-300 ${
          onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
        }`}
        style={{
          backgroundColor: 'var(--surface)',
          backgroundImage: 'linear-gradient(150deg, var(--card-tint) 0%, transparent 56%)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--panel-shadow-soft)',
          borderRadius: 'var(--panel-radius)',
          padding: 'var(--panel-padding)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--muted)' }}>
              {title}
            </p>
            <h3 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              {value}
            </h3>
            {footer && (
              <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                {footer}
              </div>
            )}
          </div>
          <div
            className="p-2 rounded-xl border bg-[var(--surface)]"
            style={{
              borderColor: 'rgba(var(--accent-rgb), 0.35)',
              backgroundColor: 'var(--bubble-bg)',
              color: 'var(--primary-dark)',
            }}
          >
            <Icon size={20} />
          </div>
        </div>
      </motion.div>
    );
  }

  const cardStyle = {
    backgroundColor: palette.background,
    borderColor: palette.border,
    color: palette.text,
    boxShadow: 'var(--panel-shadow)',
    backgroundImage:
      'radial-gradient(circle at 82% 18%, rgba(var(--primary-rgb), 0.18) 0%, transparent 46%), linear-gradient(165deg, var(--card-tint) 0%, transparent 58%)',
  };
  const cardClass = themeIndex ? '' : color;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      onClick={onClick}
      className={`p-6 rounded-3xl ${cardClass} relative overflow-hidden group transition-all duration-300 border ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={cardStyle}
    >
      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full border group-hover:scale-110 transition-transform duration-500"
        style={{
          backgroundColor: 'rgba(var(--accent-rgb), 0.22)',
          borderColor: 'rgba(var(--accent-rgb), 0.34)',
        }}
      />
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.42)' }}
      />

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="font-quicksand font-semibold text-sm mb-1" style={{ color: palette.text, opacity: 0.85 }}>
            {title}
          </p>
          <h3 className="text-3xl font-bold font-quicksand" style={{ color: palette.text }}>
            {value}
          </h3>
          {footer && (
            <div className="mt-2 text-xs font-semibold" style={{ color: palette.text, opacity: 0.78 }}>
              {footer}
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-2xl border backdrop-blur-sm"
          style={{
            color: palette.text,
            borderColor: 'rgba(var(--accent-rgb), 0.34)',
            backgroundColor: 'rgba(var(--accent-rgb), 0.18)',
          }}
        >
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
