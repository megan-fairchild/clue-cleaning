import { create } from 'zustand';
import type { PersonaId } from '../types';
import * as db from '../lib/db';

interface ProfileState {
  persona: PersonaId;
  hasHydrated: boolean;

  setPersona: (persona: PersonaId) => void;
  hydrate: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  persona: 'detective',
  hasHydrated: false,

  setPersona: async (persona) => {
    set({ persona });
    await db.setSetting('persona', { id: 'persona', value: persona });
  },

  hydrate: async () => {
    const saved = await db.getSetting<{ id: string; value: PersonaId }>('persona');
    if (saved) set({ persona: saved.value });
    set({ hasHydrated: true });
  },
}));
