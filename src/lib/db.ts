import { openDB, type IDBPDatabase } from 'idb';
import type { CompletionRecord, CrewMember, TaskAssignment, TaskSchedule, TaskTemplate } from '../types';

interface CrimeCleanDB {
  completions: { key: string; value: CompletionRecord };
  crew: { key: string; value: CrewMember };
  assignments: { key: string; value: TaskAssignment & { id: string } };
  settings: { key: string; value: { id: string; [key: string]: unknown } };
  schedules: { key: string; value: TaskSchedule };
  customTasks: { key: string; value: TaskTemplate };
}

const DB_NAME = 'crime-clean';
const DB_VERSION = 3;

export async function getDB(): Promise<IDBPDatabase<CrimeCleanDB>> {
  return openDB<CrimeCleanDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('completions')) {
        db.createObjectStore('completions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('crew')) {
        db.createObjectStore('crew', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assignments')) {
        const store = db.createObjectStore('assignments', { keyPath: 'id' });
        store.createIndex('byTask', 'taskId');
        store.createIndex('byMember', 'memberId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('schedules')) {
        db.createObjectStore('schedules', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customTasks')) {
        db.createObjectStore('customTasks', { keyPath: 'id' });
      }
    },
  });
}

// Completions
export async function getAllCompletions(): Promise<CompletionRecord[]> {
  const database = await getDB();
  return database.getAll('completions');
}

export async function addCompletion(record: CompletionRecord): Promise<void> {
  const database = await getDB();
  await database.put('completions', record);
}

export async function removeCompletion(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('completions', id);
}

// Crew
export async function getAllCrew(): Promise<CrewMember[]> {
  const database = await getDB();
  return database.getAll('crew');
}

export async function addCrewMember(member: CrewMember): Promise<void> {
  const database = await getDB();
  await database.put('crew', member);
}

export async function removeCrewMember(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('crew', id);
}

// Assignments
export async function getAllAssignments(): Promise<(TaskAssignment & { id: string })[]> {
  const database = await getDB();
  return database.getAll('assignments');
}

export async function setAssignment(taskId: string, memberId: string): Promise<void> {
  const database = await getDB();
  const id = `${taskId}::${memberId}`;
  await database.put('assignments', { id, taskId, memberId });
}

export async function removeAssignment(taskId: string, memberId: string): Promise<void> {
  const database = await getDB();
  const id = `${taskId}::${memberId}`;
  await database.delete('assignments', id);
}

// Settings
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const database = await getDB();
  const result = await database.get('settings', key);
  return result as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const database = await getDB();
  await database.put('settings', { id: key, ...(value as object) });
}

// Schedules
export async function getAllSchedules(): Promise<TaskSchedule[]> {
  const database = await getDB();
  return database.getAll('schedules');
}

export async function setSchedule(schedule: TaskSchedule): Promise<void> {
  const database = await getDB();
  await database.put('schedules', schedule);
}

export async function removeSchedule(taskId: string): Promise<void> {
  const database = await getDB();
  await database.delete('schedules', taskId);
}

// Custom Tasks
export async function getAllCustomTasks(): Promise<TaskTemplate[]> {
  const database = await getDB();
  return database.getAll('customTasks');
}

export async function addCustomTask(task: TaskTemplate): Promise<void> {
  const database = await getDB();
  await database.put('customTasks', task);
}

export async function removeCustomTask(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('customTasks', id);
}
