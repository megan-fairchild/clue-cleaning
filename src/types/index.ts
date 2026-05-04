export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyear' | 'annual';

export type PersonaId = 'rookie' | 'detective' | 'agent';

export interface TaskTemplate {
  id: string;
  roomId: string;
  frequency: Frequency;
  name: string;
  codeName: string;
  description: string;
  instructions: string;
  xp: number;
}

export interface CompletionRecord {
  id: string;
  taskId: string;
  completedBy: string;
  completedAt: string;
  periodKey: string;
  xpEarned: number;
}

export interface CrewMember {
  id: string;
  name: string;
  persona: PersonaId;
  xp: number;
  createdAt: string;
}

export interface TaskAssignment {
  taskId: string;
  memberId: string;
}

/** Schedule a task to a specific day of the week and optional time */
export interface TaskSchedule {
  id: string; // same as taskId
  taskId: string;
  /** 0=Sun, 1=Mon, ..., 6=Sat. For monthly: day of month (1-28). null = unscheduled */
  scheduledDay: number | null;
  /** HH:mm format for reminder time */
  reminderTime: string | null;
  /** ISO date string (YYYY-MM-DD) for a specific scheduled date. null = use frequency-based scheduling */
  scheduledDate: string | null;
}

export interface Room {
  id: string;
  name: string;
  codeName: string;
  icon: string;
  description: string;
  floor: 'downstairs' | 'upstairs';
}

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  icon: string;
  desc: string;
  tone: 'kid' | 'professional' | 'dramatic';
}

export interface Rank {
  name: string;
  icon: string;
  xpRequired: number;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  condition: (stats: { totalCompleted: number; streak: number; xp: number }) => boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  dailyTime: string;
  weeklyDay: number;
  weeklyTime: string;
}
