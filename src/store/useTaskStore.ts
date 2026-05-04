import { create } from 'zustand';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, format } from 'date-fns';
import type { CompletionRecord, TaskAssignment, TaskSchedule, TaskTemplate, Frequency } from '../types';
import * as db from '../lib/db';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function computePeriodKey(date: Date, frequency: Frequency): string {
  switch (frequency) {
    case 'daily':
      return format(startOfDay(date), 'yyyy-MM-dd');
    case 'weekly':
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-'W'II");
    case 'monthly':
      return format(startOfMonth(date), 'yyyy-MM');
    case 'quarterly':
      return format(startOfQuarter(date), "yyyy-'Q'Q");
    case 'halfyear': {
      const half = date.getMonth() < 6 ? 1 : 2;
      return `${date.getFullYear()}-H${half}`;
    }
    case 'annual':
      return `${date.getFullYear()}`;
  }
}

interface TaskState {
  completions: CompletionRecord[];
  assignments: (TaskAssignment & { id: string })[];
  schedules: TaskSchedule[];
  customTasks: TaskTemplate[];
  hasHydrated: boolean;

  completeTask: (taskId: string, memberId: string, xp: number, frequency: Frequency) => Promise<void>;
  uncompleteTask: (completionId: string) => Promise<void>;
  assignTask: (taskId: string, memberId: string) => Promise<void>;
  unassignTask: (taskId: string, memberId: string) => Promise<void>;
  setSchedule: (taskId: string, scheduledDay: number | null, reminderTime: string | null, scheduledDate?: string | null) => Promise<void>;
  removeSchedule: (taskId: string) => Promise<void>;
  addCustomTask: (task: TaskTemplate) => Promise<void>;
  removeCustomTask: (taskId: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  completions: [],
  assignments: [],
  schedules: [],
  customTasks: [],
  hasHydrated: false,

  completeTask: async (taskId, memberId, xp, frequency) => {
    const now = new Date();
    const periodKey = computePeriodKey(now, frequency);

    // Prevent duplicates within same period
    const existing = get().completions.find(
      (c) => c.taskId === taskId && c.completedBy === memberId && c.periodKey === periodKey,
    );
    if (existing) return;

    const record: CompletionRecord = {
      id: generateId(),
      taskId,
      completedBy: memberId,
      completedAt: now.toISOString(),
      periodKey,
      xpEarned: xp,
    };

    await db.addCompletion(record);
    set((state) => ({ completions: [...state.completions, record] }));
  },

  uncompleteTask: async (completionId) => {
    await db.removeCompletion(completionId);
    set((state) => ({
      completions: state.completions.filter((c) => c.id !== completionId),
    }));
  },

  assignTask: async (taskId, memberId) => {
    await db.setAssignment(taskId, memberId);
    const id = `${taskId}::${memberId}`;
    set((state) => ({
      assignments: [...state.assignments, { id, taskId, memberId }],
    }));
  },

  unassignTask: async (taskId, memberId) => {
    await db.removeAssignment(taskId, memberId);
    const id = `${taskId}::${memberId}`;
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    }));
  },

  setSchedule: async (taskId, scheduledDay, reminderTime, scheduledDate) => {
    const schedule: TaskSchedule = { id: taskId, taskId, scheduledDay, reminderTime, scheduledDate: scheduledDate ?? null };
    await db.setSchedule(schedule);
    set((state) => ({
      schedules: [...state.schedules.filter((s) => s.taskId !== taskId), schedule],
    }));
  },

  removeSchedule: async (taskId) => {
    await db.removeSchedule(taskId);
    set((state) => ({
      schedules: state.schedules.filter((s) => s.taskId !== taskId),
    }));
  },

  addCustomTask: async (task) => {
    await db.addCustomTask(task);
    set((state) => ({
      customTasks: [...state.customTasks, task],
    }));
  },

  removeCustomTask: async (taskId) => {
    await db.removeCustomTask(taskId);
    set((state) => ({
      customTasks: state.customTasks.filter((t) => t.id !== taskId),
    }));
  },

  hydrate: async () => {
    const [completions, assignments, schedules, customTasks] = await Promise.all([
      db.getAllCompletions(),
      db.getAllAssignments(),
      db.getAllSchedules(),
      db.getAllCustomTasks(),
    ]);
    set({ completions, assignments, schedules, customTasks, hasHydrated: true });
  },
}));
