import { motion } from 'framer-motion';
import { Check, Clock, Users } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { TaskTemplate } from '../../types';
import { useProfileStore, useCrewStore } from '../../store';
import { getTaskDisplayName } from '../../lib/personaUtils';

interface TaskCardProps {
  task: TaskTemplate;
  isCompleted: boolean;
  assignedTo: string[];
  lastCompleted?: string | null;
  dueLabel?: string;
  onComplete: () => void;
  onShowDetail: () => void;
}

const frequencyColors: Record<string, string> = {
  daily: 'bg-success/20 text-success',
  weekly: 'bg-blue-500/20 text-blue-400',
  monthly: 'bg-purple-500/20 text-purple-400',
  quarterly: 'bg-gold/20 text-gold',
  halfyear: 'bg-orange-500/20 text-orange-400',
  annual: 'bg-burgundy/30 text-red-300',
};

// Assignee colors for left border color-coding
const ASSIGNEE_COLORS = [
  '#22d3ee', // cyan
  '#a78bfa', // purple
  '#f472b6', // pink
  '#fb923c', // orange
  '#4ade80', // green
  '#facc15', // yellow
  '#60a5fa', // blue
  '#f87171', // red
];

export function getAssigneeColor(memberId: string, allMemberIds: string[]): string {
  const idx = allMemberIds.indexOf(memberId);
  return ASSIGNEE_COLORS[idx % ASSIGNEE_COLORS.length];
}

export default function TaskCard({ task, isCompleted, assignedTo, lastCompleted, dueLabel, onComplete, onShowDetail }: TaskCardProps) {
  const persona = useProfileStore((s) => s.persona);
  const members = useCrewStore((s) => s.members);
  const displayName = getTaskDisplayName(task, persona);
  const isRookie = persona === 'rookie';

  const assignedMembers = members.filter((m) => assignedTo.includes(m.id));
  const allMemberIds = members.map((m) => m.id);
  const lastCompletedLabel = lastCompleted
    ? formatDistanceToNow(parseISO(lastCompleted), { addSuffix: true })
    : null;

  // Determine border color from first assignee
  const borderColor = assignedMembers.length > 0
    ? getAssigneeColor(assignedMembers[0].id, allMemberIds)
    : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isCompleted ? 0.6 : 1, y: 0 }}
      className={clsx(
        'clue-card p-3 transition-all',
        isCompleted && 'border-success/40',
        !isCompleted && 'clue-hover'
      )}
      style={borderColor ? { borderLeftWidth: '4px', borderLeftColor: borderColor } : undefined}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className={clsx(
            'flex-shrink-0 rounded-lg border-2 transition-all flex items-center justify-center',
            isRookie ? 'w-10 h-10' : 'w-6 h-6',
            isCompleted
              ? 'bg-success border-success text-bg-primary'
              : 'border-text-muted hover:border-accent'
          )}
        >
          {isCompleted && <Check size={isRookie ? 20 : 14} />}
        </button>

        <div className="flex-1 min-w-0" onClick={onShowDetail}>
          <p className={clsx(
            'font-medium text-text truncate cursor-pointer',
            isRookie ? 'text-base' : 'text-sm',
            isCompleted && 'line-through text-text-muted'
          )}>
            {displayName}
          </p>

          {/* Due label and last completed */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {dueLabel && (
              <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                <Clock size={9} /> {dueLabel}
              </span>
            )}
            {lastCompletedLabel && (
              <span className="text-[10px] text-success/70">
                ✓ {lastCompletedLabel}
              </span>
            )}
            {!lastCompletedLabel && !isCompleted && (
              <span className="text-[10px] text-accent/60">Never done</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium uppercase', frequencyColors[task.frequency])}>
              {task.frequency}
            </span>
            <span className="text-[10px] text-gold font-mono">+{task.xp} XP</span>

            {assignedMembers.length > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Users size={10} className="text-text-muted" />
                {assignedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: getAssigneeColor(m.id, allMemberIds) + '30', color: getAssigneeColor(m.id, allMemberIds) }}
                  >
                    {m.name.slice(0, 6)}
                  </span>
                ))}
              </div>
            )}
            {assignedMembers.length === 0 && (
              <span className="text-[10px] text-text-muted ml-auto">Anyone</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
