import type { PersonaId, PersonaConfig, Rank, Frequency } from '../types';

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  rookie: {
    id: 'rookie',
    name: 'Junior Deputy',
    icon: '👦',
    desc: 'For little helpers! Super simple missions with big rewards.',
    tone: 'kid',
  },
  detective: {
    id: 'detective',
    name: 'Detective',
    icon: '🕵️',
    desc: 'Detailed guidance with step-by-step instructions.',
    tone: 'professional',
  },
  agent: {
    id: 'agent',
    name: 'Special Agent',
    icon: '🦸',
    desc: 'Full gamification. Dramatic flair. Maximum fun.',
    tone: 'dramatic',
  },
};

export const RANKS: Record<PersonaId, Rank[]> = {
  rookie: [
    { name: 'Cadet', icon: '🌱', xpRequired: 0 },
    { name: 'Junior Deputy', icon: '⭐', xpRequired: 50 },
    { name: 'Deputy', icon: '🌟', xpRequired: 150 },
    { name: 'Sergeant', icon: '💪', xpRequired: 300 },
    { name: 'Lieutenant', icon: '🎖️', xpRequired: 500 },
    { name: 'Captain', icon: '🏆', xpRequired: 800 },
    { name: 'Sheriff', icon: '👑', xpRequired: 1500 },
  ],
  detective: [
    { name: 'Trainee', icon: '📋', xpRequired: 0 },
    { name: 'Analyst', icon: '🧤', xpRequired: 100 },
    { name: 'Investigator', icon: '🔬', xpRequired: 300 },
    { name: 'Detective', icon: '🔍', xpRequired: 600 },
    { name: 'Lead Detective', icon: '🕵️', xpRequired: 1000 },
    { name: 'Chief Inspector', icon: '⭐', xpRequired: 1800 },
    { name: 'Commissioner', icon: '👑', xpRequired: 3000 },
  ],
  agent: [
    { name: 'Recruit', icon: '🎖️', xpRequired: 0 },
    { name: 'Field Agent', icon: '🔫', xpRequired: 100 },
    { name: 'Special Agent', icon: '🕶️', xpRequired: 300 },
    { name: 'Senior Agent', icon: '💣', xpRequired: 600 },
    { name: 'Commander', icon: '🦅', xpRequired: 1000 },
    { name: 'Director', icon: '⚡', xpRequired: 1800 },
    { name: 'Shadow Legend', icon: '👑', xpRequired: 3000 },
  ],
};

export interface PersonaDisplayConfig {
  taskFilter: Frequency[] | null;
  maxInstructions: number | null;
  confetti: boolean;
  completionMessages: string[];
  taskPrefix: string;
  emptyState: string;
  xpLabel: string;
  greetings: string[];
}

export const PERSONA_DISPLAY: Record<PersonaId, PersonaDisplayConfig> = {
  rookie: {
    taskFilter: ['daily', 'weekly'],
    maxInstructions: 3,
    confetti: true,
    completionMessages: [
      'AWESOME job, buddy! ⭐⭐⭐',
      'You are SO strong! 💪',
      'Wow! Super helper! 🦸‍♂️',
      'High five! ✋🎉',
      'You crushed it, dude! 🏆',
      'Mom & Dad are SO proud! 🌟',
    ],
    taskPrefix: '🎯 Your Mission: ',
    emptyState: 'No missions right now! You did EVERYTHING! Go play! 🎮🌈',
    xpLabel: '⭐ Stars',
    greetings: [
      'Hey buddy! Ready to be a cleaning superhero? 🦸‍♂️',
      "What's up, champ! Let's earn some stars! ⭐",
      'Hey dude! Got some cool missions for you! 🚀',
      "Yo! Time to show those messes who's boss! 💪",
    ],
  },
  detective: {
    taskFilter: null,
    maxInstructions: null,
    confetti: false,
    completionMessages: [
      'Case closed. ✅',
      'Evidence collected.',
      'Good detective work.',
      'Scene processed.',
    ],
    taskPrefix: '',
    emptyState: 'All cases cleared. Well done, Detective.',
    xpLabel: '🔍 XP',
    greetings: [
      "Here's your cleaning status overview.",
      'Cases are waiting, Detective.',
      'Time to process some scenes.',
    ],
  },
  agent: {
    taskFilter: null,
    maxInstructions: null,
    confetti: false,
    completionMessages: [
      'TARGET NEUTRALIZED. 🎯',
      'MISSION COMPLETE. Over.',
      'HQ confirms: scene secured.',
      'Excellent fieldwork, Agent.',
    ],
    taskPrefix: '⚠️ CLASSIFIED: ',
    emptyState: '📡 No active ops. Standby for orders, Agent.',
    xpLabel: '🎖️ Intel',
    greetings: [
      'Your crime scenes await. The clock is ticking.',
      'HQ has new assignments, Agent.',
      'Multiple scenes require attention. Move out.',
    ],
  },
};
