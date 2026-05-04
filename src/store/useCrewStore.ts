import { create } from 'zustand';
import type { CrewMember, PersonaId } from '../types';
import * as db from '../lib/db';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface CrewState {
  members: CrewMember[];
  hasHydrated: boolean;

  addMember: (name: string, persona: PersonaId) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateMemberXP: (id: string, xp: number) => void;
  hydrate: () => Promise<void>;
}

export const useCrewStore = create<CrewState>((set, get) => ({
  members: [],
  hasHydrated: false,

  addMember: async (name, persona) => {
    const member: CrewMember = {
      id: generateId(),
      name,
      persona,
      xp: 0,
      createdAt: new Date().toISOString(),
    };
    await db.addCrewMember(member);
    set((state) => ({ members: [...state.members, member] }));
  },

  removeMember: async (id) => {
    await db.removeCrewMember(id);
    set((state) => ({ members: state.members.filter((m) => m.id !== id) }));
  },

  updateMemberXP: (id, xp) => {
    const members = get().members.map((m) =>
      m.id === id ? { ...m, xp: m.xp + xp } : m,
    );
    set({ members });
    // Persist updated member
    const updated = members.find((m) => m.id === id);
    if (updated) {
      db.addCrewMember(updated);
    }
  },

  hydrate: async () => {
    const members = await db.getAllCrew();
    set({ members, hasHydrated: true });
  },
}));
