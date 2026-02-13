import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  contentClassName = '',
  theme = 'default',
}) {
  const isParentTheme = theme === 'parent';

  const containerStyle = isParentTheme
    ? {
      backgroundColor: 'var(--parent-card-bg)',
      border: '1px solid var(--parent-card-border)',
      boxShadow: 'var(--parent-card-shadow-strong)',
    }
    : undefined;

  const headerStyle = isParentTheme
    ? { borderBottomColor: 'var(--parent-header-border)' }
    : undefined;

  const titleStyle = isParentTheme
    ? { color: 'var(--parent-text)' }
    : undefined;

  const closeButtonStyle = isParentTheme
    ? {
      backgroundColor: 'var(--parent-button-soft-bg)',
      color: 'var(--parent-button-soft-text)',
      border: '1px solid var(--parent-button-soft-border)',
    }
    : undefined;

  const closeButtonHoverStyle = isParentTheme
    ? { backgroundColor: 'var(--parent-button-soft-hover)' }
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl ${maxWidth} w-full pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]`}
              style={containerStyle}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#FFE5D9]/30" style={headerStyle}>
                <h2 className="text-xl sm:text-2xl font-bold font-quicksand text-stone-800" style={titleStyle}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-[#FFF8F3] flex items-center justify-center text-stone-400 hover:text-[#FF9B85] hover:bg-[#FFE5D9] transition-colors flex-shrink-0"
                  style={closeButtonStyle}
                  onMouseEnter={(event) => {
                    if (!closeButtonHoverStyle) return;
                    Object.assign(event.currentTarget.style, closeButtonHoverStyle);
                  }}
                  onMouseLeave={(event) => {
                    if (!closeButtonStyle) return;
                    event.currentTarget.style.backgroundColor = closeButtonStyle.backgroundColor;
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className={`p-4 sm:p-6 overflow-y-auto ${contentClassName}`}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
