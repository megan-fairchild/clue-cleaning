import type { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_case',
    name: 'First Case',
    icon: '🔓',
    desc: 'Complete your very first task.',
    condition: (stats) => stats.totalCompleted >= 1,
  },
  {
    id: 'ten_cases',
    name: 'Serial Closer',
    icon: '🔟',
    desc: 'Complete 10 tasks total.',
    condition: (stats) => stats.totalCompleted >= 10,
  },
  {
    id: 'fifty_cases',
    name: 'Veteran',
    icon: '🎖️',
    desc: 'Complete 50 tasks total.',
    condition: (stats) => stats.totalCompleted >= 50,
  },
  {
    id: 'streak_3',
    name: 'Hat Trick',
    icon: '🎩',
    desc: 'Maintain a 3-day streak.',
    condition: (stats) => stats.streak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Weekly Warrior',
    icon: '⚔️',
    desc: 'Maintain a 7-day streak.',
    condition: (stats) => stats.streak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Unstoppable',
    icon: '🔥',
    desc: 'Maintain a 30-day streak.',
    condition: (stats) => stats.streak >= 30,
  },
  {
    id: 'room_clear',
    name: 'Scene Secured',
    icon: '🏠',
    desc: 'Complete all tasks in one room in a single day.',
    condition: () => false, // Evaluated externally with room context
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    icon: '🌅',
    desc: 'Complete a task before 8am.',
    condition: () => false, // Evaluated externally with time context
  },
  {
    id: 'night_owl',
    name: 'Night Shift',
    icon: '🦉',
    desc: 'Complete a task after 10pm.',
    condition: () => false, // Evaluated externally with time context
  },
  {
    id: 'all_rooms',
    name: 'Full Sweep',
    icon: '🗺️',
    desc: 'Complete at least 1 task in every room.',
    condition: () => false, // Evaluated externally with room context
  },
  {
    id: 'xp_500',
    name: 'Rising Star',
    icon: '⭐',
    desc: 'Earn 500 XP total.',
    condition: (stats) => stats.xp >= 500,
  },
  {
    id: 'xp_2000',
    name: 'Elite Agent',
    icon: '💎',
    desc: 'Earn 2000 XP total.',
    condition: (stats) => stats.xp >= 2000,
  },
];
