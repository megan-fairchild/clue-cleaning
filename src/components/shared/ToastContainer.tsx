import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store';

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} id={toast.id} message={toast.message} type={toast.type} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({
  id,
  message,
  type,
  onDismiss,
}: {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={clsx(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        type === 'success' && 'bg-success/20 border border-success/40 text-success',
        type === 'error' && 'bg-accent/20 border border-accent/40 text-accent',
        type === 'info' && 'bg-bg-card border border-bg-card text-text'
      )}
    >
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={() => onDismiss(id)} className="text-text-muted hover:text-text">
        <X size={14} />
      </button>
    </motion.div>
  );
}
