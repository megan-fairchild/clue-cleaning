import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useProfileStore, useTaskStore } from '../store';
import { PERSONAS, RANKS } from '../data/personas';
import { ACHIEVEMENTS } from '../data/achievements';
import { calculateXP, calculateStreak } from '../lib/taskUtils';
import { getCurrentRank } from '../lib/personaUtils';


export default function Profile() {
  const persona = useProfileStore((s) => s.persona);
  const setPersona = useProfileStore((s) => s.setPersona);
  const completions = useTaskStore((s) => s.completions);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalXP = calculateXP(completions);
  const streak = calculateStreak(completions);
  const totalCompleted = completions.length;
  const rank = getCurrentRank(totalXP, persona);

  const stats = { totalCompleted, streak, xp: totalXP };

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((a) => a.condition(stats)),
    [stats]
  );

  const handleExport = () => {
    const data = { completions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crime-clean-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    indexedDB.deleteDatabase('crime-clean-db');
    window.location.reload();
  };

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-gold mb-6" style={{ fontFamily: 'var(--font-family-serif)' }}>👤 Agent Dossier</h1>

      {/* Current Status */}
      <section className="mb-6 clue-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{PERSONAS[persona].icon}</span>
          <div>
            <p className="text-sm font-bold text-text">{PERSONAS[persona].name}</p>
            <p className="text-xs text-text-muted">Current Rank: <span className="text-gold">{rank.icon} {rank.name}</span></p>
            <p className="text-xs text-text-muted">{totalXP} XP · {totalCompleted} tasks completed · {streak} day streak</p>
          </div>
        </div>
      </section>

      {/* Persona Picker */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gold mb-3 uppercase tracking-wider" style={{ fontFamily: 'var(--font-family-serif)' }}>Choose Persona</h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.values(PERSONAS)).map((p) => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPersona(p.id)}
              className={clsx(
                'p-4 rounded-lg border-2 text-center transition-all',
                persona === p.id
                  ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                  : 'border-gold/20 bg-bg-card hover:border-gold/50'
              )}
            >
              <span className="text-3xl block mb-2">{p.icon}</span>
              <p className="text-sm font-medium text-text">{p.name}</p>
              <p className="text-[10px] text-text-muted mt-1 leading-tight">{p.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Rank Progression */}
        <div className="mt-4 bg-mahogany/20 border border-gold/10 rounded-lg p-3">
          <h3 className="text-[10px] font-bold text-gold/70 uppercase mb-2">Rank Progression ({PERSONAS[persona].name})</h3>
          <div className="flex flex-wrap gap-1.5">
            {RANKS[persona].map((r) => (
              <span
                key={r.name}
                className={clsx(
                  'text-[10px] px-2 py-0.5 rounded-full',
                  totalXP >= r.xpRequired
                    ? 'bg-gold/20 text-gold font-medium'
                    : 'bg-bg-card text-text-muted'
                )}
              >
                {r.icon} {r.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gold mb-3 uppercase tracking-wider" style={{ fontFamily: 'var(--font-family-serif)' }}>
          🏆 Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = achievement.condition(stats);
            return (
              <div
                key={achievement.id}
                className={clsx(
                  'p-3 rounded-lg border-2 transition-all',
                  unlocked
                    ? 'border-gold/40 bg-gold/5'
                    : 'border-gold/10 bg-bg-card opacity-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('text-lg', !unlocked && 'grayscale')}>{achievement.icon}</span>
                  <span className="text-xs font-medium text-text">{achievement.name}</span>
                </div>
                <p className="text-[10px] text-text-muted">{achievement.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Management */}
      <section>
        <h2 className="text-sm font-bold text-gold mb-3 uppercase tracking-wider" style={{ fontFamily: 'var(--font-family-serif)' }}>⚙️ Data</h2>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full bg-bg-card border border-gold/20 text-text py-2.5 rounded-lg text-sm hover:border-gold/50 transition-colors"
          >
            📤 Export Data
          </button>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full bg-bg-card border border-gold/20 text-warning py-2.5 rounded-lg text-sm hover:border-warning/50 transition-colors"
            >
              🗑️ Reset All Data
            </button>
          ) : (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm text-text mb-3">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-warning text-white py-2 rounded-lg text-sm font-medium"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-bg-card border border-gold/20 text-text py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
