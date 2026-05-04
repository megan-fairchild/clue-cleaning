import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #1e3a1e 0%, #2a4a2a 100%)',
              border: '2px solid var(--color-gold)',
              boxShadow: '0 0 30px rgba(201,168,76,0.2), 0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gold/30">
              <h2 className="text-lg font-bold text-gold" style={{ fontFamily: 'var(--font-family-serif)' }}>{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
