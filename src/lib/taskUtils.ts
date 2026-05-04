import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, format, subDays, parseISO } from 'date-fns';
import type { Frequency, TaskTemplate, CompletionRecord } from '../types';

export function getPeriodKey(date: Date, frequency: Frequency): string {
  switch (frequency) {
    case 'daily':
      return format(date, 'yyyy-MM-dd');
    case 'weekly': {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const year = format(weekStart, 'yyyy');
      const week = format(date, 'II');
      return `${year}-W${week}`;
    }
    case 'monthly':
      return format(date, 'yyyy-MM');
    case 'quarterly': {
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${format(date, 'yyyy')}-Q${q}`;
    }
    case 'halfyear': {
      const h = date.getMonth() < 6 ? 1 : 2;
      return `${format(date, 'yyyy')}-H${h}`;
    }
    case 'annual':
      return format(date, 'yyyy');
  }
}

export function isTaskDue(task: TaskTemplate, completions: CompletionRecord[]): boolean {
  const now = new Date();
  const currentPeriod = getPeriodKey(now, task.frequency);
  return !completions.some(
    (c) => c.taskId === task.id && c.periodKey === currentPeriod
  );
}

export function getNextDueDate(frequency: Frequency, from?: Date): Date {
  const date = from ?? new Date();
  switch (frequency) {
    case 'daily':
      return startOfDay(new Date(date.getTime() + 86400000));
    case 'weekly': {
      const next = startOfWeek(date, { weekStartsOn: 1 });
      next.setDate(next.getDate() + 7);
      return next;
    }
    case 'monthly': {
      const next = startOfMonth(date);
      next.setMonth(next.getMonth() + 1);
      return next;
    }
    case 'quarterly': {
      const next = startOfQuarter(date);
      next.setMonth(next.getMonth() + 3);
      return next;
    }
    case 'halfyear': {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month < 6) return new Date(year, 6, 1);
      return new Date(year + 1, 0, 1);
    }
    case 'annual': {
      return new Date(date.getFullYear() + 1, 0, 1);
    }
  }
}

export function getCompletionInPeriod(
  taskId: string,
  completions: CompletionRecord[],
  frequency: Frequency
): CompletionRecord | undefined {
  const currentPeriod = getPeriodKey(new Date(), frequency);
  return completions.find(
    (c) => c.taskId === taskId && c.periodKey === currentPeriod
  );
}

export function calculateXP(completions: CompletionRecord[]): number {
  return completions.reduce((sum, c) => sum + c.xpEarned, 0);
}

export function calculateStreak(completions: CompletionRecord[]): number {
  if (completions.length === 0) return 0;

  const days = new Set<string>();
  for (const c of completions) {
    days.add(format(parseISO(c.completedAt), 'yyyy-MM-dd'));
  }

  const sortedDays = Array.from(days).sort().reverse();
  if (sortedDays.length === 0) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Streak must include today or yesterday
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const current = parseISO(sortedDays[i - 1]);
    const prev = parseISO(sortedDays[i]);
    const diff = startOfDay(current).getTime() - startOfDay(prev).getTime();
    if (diff === 86400000) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
