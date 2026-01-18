import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) {
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
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#FFE5D9]/30">
                <h2 className="text-xl sm:text-2xl font-bold font-quicksand text-stone-800">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-[#FFF8F3] flex items-center justify-center text-stone-400 hover:text-[#FF9B85] hover:bg-[#FFE5D9] transition-colors flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
