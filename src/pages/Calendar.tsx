import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isMonday,
  getDate,
  getMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore, useCrewStore } from '../store';
import { TASK_TEMPLATES } from '../data/tasks';
import { getPeriodKey, getNextDueDate } from '../lib/taskUtils';
import { getAssigneeColor } from '../components/shared/TaskCard';
import type { TaskTemplate, Frequency } from '../types';

const FREQUENCY_COLORS: Record<Frequency, string> = {
  daily: 'bg-cyan-400',
  weekly: 'bg-blue-500',
  monthly: 'bg-yellow-400',
  quarterly: 'bg-orange-500',
  halfyear: 'bg-red-500',
  annual: 'bg-purple-500',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  halfyear: 'Half-Year',
  annual: 'Annual',
};

function isQuarterStart(date: Date): boolean {
  const day = getDate(date);
  const month = getMonth(date);
  return day === 1 && [0, 3, 6, 9].includes(month);
}

function isHalfYearStart(date: Date): boolean {
  const day = getDate(date);
  const month = getMonth(date);
  return day === 1 && [0, 6].includes(month);
}

function isAnnualStart(date: Date): boolean {
  return getDate(date) === 1 && getMonth(date) === 0;
}

function getTasksForDay(date: Date): TaskTemplate[] {
  return TASK_TEMPLATES.filter((task) => {
    switch (task.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return isMonday(date);
      case 'monthly':
        return getDate(date) === 1;
      case 'quarterly':
        return isQuarterStart(date);
      case 'halfyear':
        return isHalfYearStart(date);
      case 'annual':
        return isAnnualStart(date);
      default:
        return false;
    }
  });
}

function isTaskCompletedForDay(
  task: TaskTemplate,
  date: Date,
  completions: { taskId: string; periodKey: string }[]
): boolean {
  const periodKey = getPeriodKey(date, task.frequency);
  return completions.some(
    (c) => c.taskId === task.id && c.periodKey === periodKey
  );
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const completions = useTaskStore((s) => s.completions);
  const schedules = useTaskStore((s) => s.schedules);
  const assignments = useTaskStore((s) => s.assignments);
  const members = useCrewStore((s) => s.members);
  const allMemberIds = members.map((m) => m.id);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Get tasks for a specific calendar day, including date-scheduled and day-scheduled tasks
  const getTasksForDayWithSchedules = (date: Date): TaskTemplate[] => {
    const dateISO = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0=Sun
    const dayOfMonth = getDate(date);
    const baseTasks = getTasksForDay(date);

    // Add tasks that have a specific scheduledDate matching this day
    const dateScheduledTasks = schedules
      .filter((s) => s.scheduledDate === dateISO)
      .map((s) => TASK_TEMPLATES.find((t) => t.id === s.taskId))
      .filter((t): t is TaskTemplate => !!t && !baseTasks.some((bt) => bt.id === t.id));

    // Add weekly tasks scheduled for this day-of-week
    const weeklyScheduledTasks = schedules
      .filter((s) => !s.scheduledDate && s.scheduledDay === dayOfWeek)
      .map((s) => TASK_TEMPLATES.find((t) => t.id === s.taskId))
      .filter((t): t is TaskTemplate => !!t && t.frequency === 'weekly' && !baseTasks.some((bt) => bt.id === t.id) && !dateScheduledTasks.some((dt) => dt.id === t.id));

    // Add monthly tasks scheduled for this day-of-month
    const monthlyScheduledTasks = schedules
      .filter((s) => !s.scheduledDate && s.scheduledDay === dayOfMonth)
      .map((s) => TASK_TEMPLATES.find((t) => t.id === s.taskId))
      .filter((t): t is TaskTemplate => !!t && t.frequency === 'monthly' && !baseTasks.some((bt) => bt.id === t.id) && !dateScheduledTasks.some((dt) => dt.id === t.id));

    return [...baseTasks, ...dateScheduledTasks, ...weeklyScheduledTasks, ...monthlyScheduledTasks];
  };

  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return getTasksForDayWithSchedules(selectedDay);
  }, [selectedDay, schedules]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const upcoming: { task: TaskTemplate; dueDate: Date }[] = [];

    for (const task of TASK_TEMPLATES) {
      const nextDue = getNextDueDate(task.frequency, today);
      if (!isSameDay(nextDue, today)) {
        upcoming.push({ task, dueDate: nextDue });
      }
    }

    upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return upcoming.slice(0, 5);
  }, []);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="px-4 py-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays size={20} className="text-accent" />
        <h1 className="text-lg font-bold text-text">Calendar</h1>
      </div>

      {/* Month Navigation */}
      <div className="bg-bg-card rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-bg-secondary text-text-muted hover:text-text transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-text font-semibold text-base">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-bg-secondary text-text-muted hover:text-text transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-[10px] text-text-muted font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const selected = selectedDay ? isSameDay(day, selectedDay) : false;
            const dayTasks = getTasksForDayWithSchedules(day);
            const allCompleted =
              dayTasks.length > 0 &&
              dayTasks.every((t) => isTaskCompletedForDay(t, day, completions));

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all
                  ${inMonth ? 'text-text' : 'text-text-muted/40'}
                  ${today ? 'ring-2 ring-accent' : ''}
                  ${selected ? 'bg-accent/20' : 'bg-bg-secondary hover:bg-bg-secondary/80'}
                  ${allCompleted && inMonth ? 'bg-success/10' : ''}
                `}
              >
                <span className={`${today ? 'font-bold text-accent' : ''}`}>
                  {format(day, 'd')}
                </span>
                {/* Task dots */}
                {dayTasks.length > 0 && inMonth && (
                  <div className="flex gap-[2px] mt-[2px] flex-wrap justify-center max-w-[90%]">
                    {dayTasks.slice(0, 4).map((task, i) => {
                      const taskAssignee = assignments.find((a) => a.taskId === task.id);
                      const dotColor = taskAssignee
                        ? getAssigneeColor(taskAssignee.memberId, allMemberIds)
                        : undefined;
                      return (
                        <span
                          key={i}
                          className={`w-[4px] h-[4px] rounded-full ${!dotColor ? FREQUENCY_COLORS[task.frequency] : ''}`}
                          style={dotColor ? { backgroundColor: dotColor } : undefined}
                        />
                      );
                    })}
                    {dayTasks.length > 4 && (
                      <span className="w-[4px] h-[4px] rounded-full bg-text-muted" />
                    )}
                  </div>
                )}
                {/* Completion indicator */}
                {allCompleted && dayTasks.length > 0 && inMonth && (
                  <div className="absolute top-0.5 right-0.5">
                    <Check size={8} className="text-success" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Task List */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-bg-card rounded-xl p-4 mb-4"
          >
            <h3 className="text-text font-semibold text-sm mb-3">
              {format(selectedDay, 'EEEE, MMM d, yyyy')}
            </h3>
            {selectedDayTasks.length === 0 ? (
              <p className="text-text-muted text-xs">No tasks scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map((task) => {
                  const completed = isTaskCompletedForDay(task, selectedDay, completions);
                  const taskAssignees = assignments.filter((a) => a.taskId === task.id);
                  const firstAssignee = taskAssignees.length > 0 ? taskAssignees[0].memberId : null;
                  const assigneeColor = firstAssignee ? getAssigneeColor(firstAssignee, allMemberIds) : undefined;
                  const assigneeNames = taskAssignees.map((a) => members.find((m) => m.id === a.memberId)?.name).filter(Boolean);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        completed ? 'bg-success/10' : 'bg-bg-secondary'
                      }`}
                      style={assigneeColor ? { borderLeftWidth: '3px', borderLeftColor: assigneeColor } : undefined}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${FREQUENCY_COLORS[task.frequency]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            completed ? 'text-success line-through' : 'text-text'
                          }`}
                        >
                          {task.codeName}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {FREQUENCY_LABELS[task.frequency]}
                          {assigneeNames.length > 0 && (
                            <span style={{ color: assigneeColor }}> • {assigneeNames.join(', ')}</span>
                          )}
                        </p>
                      </div>
                      {completed && <Check size={14} className="text-success shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Tasks */}
      <div className="bg-bg-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-warning" />
          <h3 className="text-text font-semibold text-sm">Upcoming Tasks</h3>
        </div>
        {upcomingTasks.length === 0 ? (
          <p className="text-text-muted text-xs">No upcoming tasks.</p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map(({ task, dueDate }) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${FREQUENCY_COLORS[task.frequency]}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate">{task.codeName}</p>
                  <p className="text-[10px] text-text-muted">
                    {FREQUENCY_LABELS[task.frequency]}
                  </p>
                </div>
                <span className="text-[10px] text-text-muted whitespace-nowrap">
                  {format(dueDate, 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
