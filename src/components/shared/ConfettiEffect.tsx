import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const COLORS = ['#e94560', '#4ecdc4', '#feca57', '#ff6b8a', '#a855f7', '#3b82f6', '#10b981'];

export default function ConfettiEffect({ trigger, onComplete }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.3,
        rotation: Math.random() * 720 - 360,
        size: Math.random() * 8 + 4,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[300] overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
              animate={{ y: '100vh', opacity: 0, rotate: p.rotation }}
              transition={{ duration: 2, delay: p.delay, ease: 'easeIn' }}
              style={{ position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.size > 8 ? '50%' : '2px' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
