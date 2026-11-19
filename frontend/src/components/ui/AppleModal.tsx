import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface AppleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  type?: 'slide-over' | 'center';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const AppleModal: React.FC<AppleModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  type = 'slide-over',
  maxWidth = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-md"
            aria-hidden="true"
          />

          {type === 'slide-over' ? (
            /* Slide-Over Drawer from Right */
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`fixed inset-y-0 right-0 w-full ${MAX_WIDTHS[maxWidth]} bg-white/85 backdrop-blur-2xl border-l border-white/50 shadow-[-20px_0_50px_rgba(0,0,0,0.12)] z-10 flex flex-col justify-between overflow-hidden`}
              role="dialog"
              aria-modal="true"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 bg-white/40">
                <div className="min-w-0 flex-1 pr-4">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer active:scale-95 shrink-0"
                  aria-label="Yopish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-slate-200/60 p-4 px-6 bg-white/50 backdrop-blur-xl">
                  {footer}
                </div>
              )}
            </motion.div>
          ) : (
            /* Center visionOS Glass Modal */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className={`relative w-full ${MAX_WIDTHS[maxWidth]} mx-4 rounded-3xl border border-white/60 bg-white/85 backdrop-blur-2xl shadow-[0_24px_60px_-15px_rgba(15,23,42,0.16)] z-10 overflow-hidden`}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 bg-white/40">
                <div className="min-w-0 flex-1 pr-4">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer active:scale-95 shrink-0"
                  aria-label="Yopish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-slate-200/60 p-4 px-6 bg-white/50 backdrop-blur-xl">
                  {footer}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
