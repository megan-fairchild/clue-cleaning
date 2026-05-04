import { useMemo } from 'react';
import { TASK_TEMPLATES } from '../data/tasks';
import { useTaskStore } from '../store/useTaskStore';
import type { TaskTemplate } from '../types';

/** Returns built-in TASK_TEMPLATES merged with user-created custom tasks */
export function useAllTasks(): TaskTemplate[] {
  const customTasks = useTaskStore((s) => s.customTasks);
  return useMemo(
    () => [...TASK_TEMPLATES, ...customTasks],
    [customTasks]
  );
}
