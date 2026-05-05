import { useProfileStore, useTaskStore, useAuthStore } from '../../store';
import { PERSONAS } from '../../data/personas';
import { getCurrentRank } from '../../lib/personaUtils';
import { calculateXP } from '../../lib/taskUtils';
import { LogOut } from 'lucide-react';

export default function Header() {
  const persona = useProfileStore((s) => s.persona);
  const completions = useTaskStore((s) => s.completions);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const totalXP = calculateXP(completions);
  const rank = getCurrentRank(totalXP, persona);
  const personaConfig = PERSONAS[persona];

  return (
    <header className="sticky top-0 z-50 wood-header">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/assets/magnifying-glass.png" alt="" className="w-7 h-7 object-contain" />
          <h1 className="text-lg font-bold text-gold" style={{ fontFamily: 'var(--font-family-serif)' }}>
            Clue Cleaning
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-felt/50 border border-gold/30 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-sm">{personaConfig.icon}</span>
            <span className="text-xs text-gold font-medium">{currentUser?.name || rank.name}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-full hover:bg-felt/50 text-gold/60 hover:text-gold transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-40" />
    </header>
  );
}
