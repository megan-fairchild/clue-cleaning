import type { PersonaId, TaskTemplate, Rank } from '../types';
import { PERSONA_DISPLAY, RANKS } from '../data/personas';

export function getTaskDisplayName(task: TaskTemplate, persona: PersonaId): string {
  if (persona === 'agent') return task.codeName;
  return task.name;
}

export function getRoomDisplayName(
  room: { name: string; codeName: string },
  persona: PersonaId
): string {
  if (persona === 'agent') return room.codeName;
  return room.name;
}

export function shouldShowTask(task: TaskTemplate, persona: PersonaId): boolean {
  const filter = PERSONA_DISPLAY[persona].taskFilter;
  if (!filter) return true;
  return filter.includes(task.frequency);
}

export function getCurrentRank(xp: number, persona: PersonaId): Rank {
  const ranks = RANKS[persona];
  let current = ranks[0];
  for (const rank of ranks) {
    if (xp >= rank.xpRequired) {
      current = rank;
    } else {
      break;
    }
  }
  return current;
}

export function getNextRank(xp: number, persona: PersonaId): Rank | null {
  const ranks = RANKS[persona];
  for (const rank of ranks) {
    if (rank.xpRequired > xp) {
      return rank;
    }
  }
  return null;
}

export function getRandomGreeting(persona: PersonaId): string {
  const greetings = PERSONA_DISPLAY[persona].greetings;
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export function getRandomCompletionMessage(persona: PersonaId): string {
  const messages = PERSONA_DISPLAY[persona].completionMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getXPLabel(persona: PersonaId): string {
  return PERSONA_DISPLAY[persona].xpLabel;
}
