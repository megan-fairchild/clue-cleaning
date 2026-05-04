export { useProfileStore } from './useProfileStore';
export { useTaskStore } from './useTaskStore';
export { useCrewStore } from './useCrewStore';
export { useUIStore } from './useUIStore';

import { useProfileStore } from './useProfileStore';
import { useTaskStore } from './useTaskStore';
import { useCrewStore } from './useCrewStore';

/** Returns true only when all persisted stores have finished hydrating from IDB */
export function useHydrated(): boolean {
  const p = useProfileStore((s) => s.hasHydrated);
  const t = useTaskStore((s) => s.hasHydrated);
  const c = useCrewStore((s) => s.hasHydrated);
  return p && t && c;
}
