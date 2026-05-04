import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, CheckCircle2, Trophy, Clock, CalendarClock, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useProfileStore, useTaskStore, useCrewStore } from '../store';
import { useAllTasks } from '../lib/useAllTasks';
import { isTaskDue, calculateXP, calculateStreak, getPeriodKey } from '../lib/taskUtils';
import { getRandomGreeting, getCurrentRank, getNextRank, getXPLabel, shouldShowTask } from '../lib/personaUtils';
import ProgressBar from '../components/shared/ProgressBar';
import Modal from '../components/shared/Modal';
import HouseMap from '../components/shared/HouseMap';
import type { TaskTemplate } from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const persona = useProfileStore((s) => s.persona);
  const completions = useTaskStore((s) => s.completions);
  const assignments = useTaskStore((s) => s.assignments);
  const schedules = useTaskStore((s) => s.schedules);
  const setSchedule = useTaskStore((s) => s.setSchedule);
  const assignTask = useTaskStore((s) => s.assignTask);
  const unassignTask = useTaskStore((s) => s.unassignTask);
  const members = useCrewStore((s) => s.members);

  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const allTasks = useAllTasks();

  const totalXP = calculateXP(completions);
  const streak = calculateStreak(completions);
  const rank = getCurrentRank(totalXP, persona);
  const nextRank = getNextRank(totalXP, persona);

  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0=Sun
  const todayDayOfMonth = today.getDate();

  const visibleTasks = useMemo(
    () => allTasks.filter((t) => shouldShowTask(t, persona)),
    [persona, allTasks]
  );

  // Determine if a task is "for today" based on frequency + schedule
  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const isTaskForToday = useCallback((task: TaskTemplate): boolean => {
    // Daily tasks are always for today
    if (task.frequency === 'daily') return true;

    // Check if task has a schedule
    const schedule = schedules.find((s) => s.taskId === task.id);

    // If scheduled for a specific date, check if it's today
    if (schedule?.scheduledDate) {
      return schedule.scheduledDate === todayISO;
    }

    if (schedule && schedule.scheduledDay !== null) {
      if (task.frequency === 'weekly') {
        return schedule.scheduledDay === todayDayOfWeek;
      }
      if (task.frequency === 'monthly') {
        return schedule.scheduledDay === todayDayOfMonth;
      }
    }

    // Unscheduled non-daily tasks: not shown on Today unless it's their natural due day
    // Weekly: show on Monday if unscheduled
    if (task.frequency === 'weekly' && !schedule) return todayDayOfWeek === 1;
    // Monthly: show on 1st if unscheduled
    if (task.frequency === 'monthly' && !schedule) return todayDayOfMonth === 1;
    // Quarterly: show on 1st of quarter months
    if (task.frequency === 'quarterly') {
      return todayDayOfMonth === 1 && [0, 3, 6, 9].includes(today.getMonth());
    }
    // Halfyear/annual: show on 1st of relevant months
    if (task.frequency === 'halfyear') {
      return todayDayOfMonth === 1 && [0, 6].includes(today.getMonth());
    }
    if (task.frequency === 'annual') {
      return today.getMonth() === 0 && todayDayOfMonth === 1;
    }
    return false;
  }, [schedules, todayDayOfWeek, todayDayOfMonth, todayISO, today]);

  // Get last completion for a task
  const getLastCompleted = useCallback((taskId: string): string | null => {
    const taskCompletions = completions
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return taskCompletions[0]?.completedAt || null;
  }, [completions]);

  const { todayTasks, completedToday } = useMemo(() => {
    const todayKey = getPeriodKey(today, 'daily');
    const todayItems: TaskTemplate[] = [];
    const completed: TaskTemplate[] = [];

    for (const task of visibleTasks) {
      const isDue = isTaskDue(task, completions);
      const forToday = isTaskForToday(task);

      if (!isDue) {
        const wasCompletedToday = completions.some(
          (c) => c.taskId === task.id && c.completedAt.startsWith(todayKey)
        );
        if (wasCompletedToday) completed.push(task);
      } else if (forToday) {
        todayItems.push(task);
      }
    }

    return { todayTasks: todayItems, completedToday: completed };
  }, [visibleTasks, completions, isTaskForToday, today]);

  const getAssignedTo = (taskId: string) =>
    assignments.filter((a) => a.taskId === taskId).map((a) => a.memberId);

  const greeting = useMemo(() => getRandomGreeting(persona), [persona]);
  const detailTask = allTasks.find((t) => t.id === selectedTask);
  const detailSchedule = detailTask ? schedules.find((s) => s.taskId === detailTask.id) : null;
  const detailLastCompleted = detailTask ? getLastCompleted(detailTask.id) : null;

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Greeting */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-text-muted text-sm mb-4"
      >
        {greeting}
      </motion.p>

      {/* XP Progress */}
      {nextRank && (
        <div className="mb-6 clue-card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gold">{rank.icon} {rank.name}</span>
          </div>
          <ProgressBar value={totalXP - rank.xpRequired} max={nextRank.xpRequired - rank.xpRequired} label={getXPLabel(persona)} colorClass="bg-gold" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <StatCard icon={<Target size={16} className="text-gold" />} value={todayTasks.length} label="Today" />
        <StatCard icon={<CheckCircle2 size={16} className="text-success" />} value={completedToday.length} label="Done" />
        <StatCard icon={<Flame size={16} className="text-warning" />} value={streak} label="Streak" />
        <StatCard icon={<Trophy size={16} className="text-gold-bright" />} value={totalXP} label={getXPLabel(persona).replace(/[^\w\s]/g, '')} />
      </div>

      {/* Interactive House Map */}
      <HouseMap />

      {/* Task Detail Modal with Scheduling */}
      <Modal isOpen={!!detailTask} onClose={() => setSelectedTask(null)} title={detailTask?.name || ''}>
        {detailTask && (
          <div className="space-y-4">
            <p className="text-text-muted text-sm">{detailTask.description}</p>

            {/* Last completed */}
            <div className="flex items-center gap-2 text-xs text-text-muted bg-mahogany/30 border border-gold/20 rounded-lg px-3 py-2">
              <Clock size={12} />
              <span>
                {detailLastCompleted
                  ? `Last completed ${formatDistanceToNow(parseISO(detailLastCompleted), { addSuffix: true })}`
                  : 'Never completed'}
              </span>
            </div>

            {/* Schedule */}
            <div className="bg-mahogany/20 border border-gold/10 rounded-lg p-3">
              <h3 className="text-xs font-bold text-gold uppercase mb-2 flex items-center gap-1.5">
                <CalendarClock size={12} className="text-gold" /> Schedule
              </h3>
              {detailTask.frequency === 'daily' ? (
                <p className="text-xs text-text-muted">Daily tasks are due every day — no scheduling needed.</p>
              ) : detailTask.frequency === 'weekly' ? (
                <div>
                  <p className="text-[10px] text-text-muted mb-2">Which day should this be done?</p>
                  <div className="flex gap-1">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => setSchedule(detailTask.id, i, detailSchedule?.reminderTime || null, null)}
                        className={clsx(
                          'flex-1 py-1.5 rounded text-[10px] font-medium transition-colors',
                          detailSchedule?.scheduledDay === i && !detailSchedule?.scheduledDate
                            ? 'bg-accent text-white'
                            : 'bg-bg-card text-text-muted hover:text-text'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              ) : detailTask.frequency === 'monthly' ? (
                <div>
                  <p className="text-[10px] text-text-muted mb-2">Day of month to complete:</p>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        onClick={() => setSchedule(detailTask.id, day, detailSchedule?.reminderTime || null, null)}
                        className={clsx(
                          'py-1 rounded text-[10px] font-medium transition-colors',
                          detailSchedule?.scheduledDay === day && !detailSchedule?.scheduledDate
                            ? 'bg-accent text-white'
                            : 'bg-bg-card text-text-muted hover:text-text'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted">This task recurs {detailTask.frequency} and appears on its natural due date.</p>
              )}

              {/* Reminder time */}
              {detailTask.frequency !== 'daily' && (
                <div className="mt-3">
                  <p className="text-[10px] text-text-muted mb-1">Reminder time:</p>
                  <input
                    type="time"
                    value={detailSchedule?.reminderTime || ''}
                    onChange={(e) => setSchedule(detailTask.id, detailSchedule?.scheduledDay ?? null, e.target.value || null, detailSchedule?.scheduledDate)}
                    className="bg-bg-card border border-gold/20 rounded-lg px-3 py-1.5 text-xs text-text w-full focus:outline-none focus:border-gold [color-scheme:dark]"
                  />
                </div>
              )}

              {/* Schedule for a specific date */}
              {detailTask.frequency !== 'daily' && (
                <div className="mt-3">
                  <p className="text-[10px] text-text-muted mb-1">Or schedule for a specific date:</p>
                  <input
                    type="date"
                    value={detailSchedule?.scheduledDate || ''}
                    onChange={(e) => {
                      const dateVal = e.target.value || null;
                      setSchedule(detailTask.id, dateVal ? null : detailSchedule?.scheduledDay ?? null, detailSchedule?.reminderTime || null, dateVal);
                    }}
                    className="bg-bg-card border border-gold/20 rounded-lg px-3 py-1.5 text-xs text-text w-full focus:outline-none focus:border-gold [color-scheme:dark]"
                  />
                  {detailSchedule?.scheduledDate && (
                    <button
                      onClick={() => setSchedule(detailTask.id, detailSchedule?.scheduledDay ?? null, detailSchedule?.reminderTime || null, null)}
                      className="mt-1 text-[10px] text-red-400 hover:text-red-300 underline"
                    >
                      Clear specific date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-xs font-bold text-text uppercase mb-2">Instructions</h3>
              <ol className="space-y-1.5 list-none">
                {detailTask.instructions.split('\n').filter(Boolean).map((step, i) => (
                  <li key={i} className="text-sm text-text-muted flex gap-2">
                    <span className="text-accent font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{step.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Assign to Crew */}
            {members.length > 0 && (
              <div className="bg-mahogany/20 border border-gold/10 rounded-lg p-3">
                <h3 className="text-xs font-bold text-gold uppercase mb-2 flex items-center gap-1.5">
                  <UserPlus size={12} className="text-gold" /> Assign to Crew
                </h3>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const isAssigned = getAssignedTo(detailTask.id).includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => isAssigned ? unassignTask(detailTask.id, m.id) : assignTask(detailTask.id, m.id)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                          isAssigned
                            ? 'bg-gold/20 text-gold border-gold/50'
                            : 'bg-bg-card text-text-muted border-gold/20 hover:border-gold/40'
                        )}
                      >
                        {isAssigned ? '✓ ' : ''}{m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <span className="text-xs bg-bg-card px-2 py-1 rounded text-text-muted">{detailTask.frequency}</span>
              <span className="text-xs bg-warning/20 px-2 py-1 rounded text-warning">+{detailTask.xp} XP</span>
              {detailSchedule?.scheduledDate && (
                <span className="text-xs bg-accent/20 px-2 py-1 rounded text-accent">
                  📅 {new Date(detailSchedule.scheduledDate + 'T00:00').toLocaleDateString()}
                </span>
              )}
              {!detailSchedule?.scheduledDate && detailSchedule?.scheduledDay !== null && detailSchedule?.scheduledDay !== undefined && (
                <span className="text-xs bg-accent/20 px-2 py-1 rounded text-accent">
                  📅 {detailTask.frequency === 'weekly' ? DAY_NAMES[detailSchedule.scheduledDay] : `Day ${detailSchedule.scheduledDay}`}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="clue-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}
