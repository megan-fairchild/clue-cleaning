import { useMemo } from 'react';
import { useProfileStore, useTaskStore } from '../store';
import { ROOMS } from '../data/rooms';
import { TASK_TEMPLATES } from '../data/tasks';
import { isTaskDue, calculateXP } from '../lib/taskUtils';
import { getRoomDisplayName, getXPLabel } from '../lib/personaUtils';
import ProgressBar from '../components/shared/ProgressBar';
import type { Frequency } from '../types';

const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'halfyear', 'annual'];

export default function Progress() {
  const persona = useProfileStore((s) => s.persona);
  const completions = useTaskStore((s) => s.completions);
  const totalXP = calculateXP(completions);

  // Completion rates by frequency
  const freqStats = useMemo(() => {
    return FREQUENCIES.map((freq) => {
      const tasks = TASK_TEMPLATES.filter((t) => t.frequency === freq);
      const completed = tasks.filter((t) => !isTaskDue(t, completions)).length;
      return { freq, total: tasks.length, completed };
    }).filter((s) => s.total > 0);
  }, [completions]);

  // Room progress
  const roomStats = useMemo(() => {
    return ROOMS.map((room) => {
      const tasks = TASK_TEMPLATES.filter((t) => t.roomId === room.id);
      const completed = tasks.filter((t) => !isTaskDue(t, completions)).length;
      return { room, total: tasks.length, completed };
    });
  }, [completions]);

  // XP by frequency (simple bar chart data)
  const xpByFreq = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of completions) {
      const task = TASK_TEMPLATES.find((t) => t.id === c.taskId);
      if (task) {
        map[task.frequency] = (map[task.frequency] || 0) + c.xpEarned;
      }
    }
    return FREQUENCIES.map((f) => ({ freq: f, xp: map[f] || 0 }));
  }, [completions]);

  const maxXP = Math.max(...xpByFreq.map((x) => x.xp), 1);

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-text mb-6">📊 Progress</h1>

      {/* Total XP */}
      <div className="bg-bg-card rounded-xl p-4 mb-6 text-center">
        <p className="text-3xl font-bold text-accent">{totalXP}</p>
        <p className="text-xs text-text-muted">{getXPLabel(persona)} Earned</p>
      </div>

      {/* Completion by Frequency */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Completion by Frequency</h2>
        <div className="space-y-3">
          {freqStats.map(({ freq, total, completed }) => (
            <ProgressBar
              key={freq}
              value={completed}
              max={total}
              label={freq.charAt(0).toUpperCase() + freq.slice(1)}
              colorClass="bg-success"
            />
          ))}
        </div>
      </section>

      {/* Room Progress */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Progress by Room</h2>
        <div className="space-y-3">
          {roomStats.map(({ room, total, completed }) => (
            <div key={room.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{room.icon}</span>
                <span className="text-xs text-text-muted">{getRoomDisplayName(room, persona)}</span>
              </div>
              <ProgressBar value={completed} max={total} colorClass="bg-accent" />
            </div>
          ))}
        </div>
      </section>

      {/* XP Distribution */}
      <section>
        <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">XP Distribution</h2>
        <div className="bg-bg-card rounded-xl p-4">
          <div className="flex items-end gap-2 h-32">
            {xpByFreq.map(({ freq, xp }) => (
              <div key={freq} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-24">
                  <div
                    className="w-full bg-accent/60 rounded-t-sm transition-all"
                    style={{ height: `${(xp / maxXP) * 100}%`, minHeight: xp > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-[8px] text-text-muted capitalize">{freq.slice(0, 3)}</span>
                <span className="text-[8px] text-warning">{xp}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
