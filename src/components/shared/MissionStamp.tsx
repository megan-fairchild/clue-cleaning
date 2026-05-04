import { motion, AnimatePresence } from 'framer-motion';

interface MissionStampProps {
  show: boolean;
}

export default function MissionStamp({ show }: MissionStampProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
        >
          <div className="border-4 border-accent rounded-lg px-8 py-4 bg-accent/10 backdrop-blur-sm">
            <p className="text-accent font-bold text-2xl tracking-widest uppercase font-mono">
              Mission Complete
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
