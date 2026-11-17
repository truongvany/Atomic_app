import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="bottom-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#3D040E]/40 backdrop-blur-[4px]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            key="bottom-sheet-panel"
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
            className="w-full sm:max-w-[520px] max-h-[88vh] bg-[#FDFBF7]/95 backdrop-blur-xl rounded-t-[26px] sm:rounded-[24px] border-t border-x sm:border border-[#FFFFFF]/80 flex flex-col overflow-hidden shadow-[0_18px_50px_rgba(61,4,14,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-2.5 sm:pt-4 pb-3 px-4 sm:px-5 border-b border-[#EFE8E0] bg-transparent shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#D8CFC5] mx-auto mb-2.5 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-[#3D040E] leading-snug">{title}</h3>
                  {subtitle && <p className="text-[12px] text-[#6E5B5D] mt-0.5">{subtitle}</p>}
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={onClose}
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-[#E5DBD0] bg-[#F7F3EE] text-[#3D040E] inline-flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
