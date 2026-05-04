import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Clock, CalendarClock, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useProfileStore, useTaskStore, useCrewStore, useUIStore } from '../store';
import { ROOMS } from '../data/rooms';
import { ROOM_IMAGES } from '../data/roomImages';
import { useAllTasks } from '../lib/useAllTasks';
import { isTaskDue } from '../lib/taskUtils';
import { getRoomDisplayName, getRandomCompletionMessage } from '../lib/personaUtils';
import type { Frequency, TaskTemplate } from '../types';
import TaskCard from '../components/shared/TaskCard';
import ConfettiEffect from '../components/shared/ConfettiEffect';
import MissionStamp from '../components/shared/MissionStamp';
import Modal from '../components/shared/Modal';


const FREQUENCY_TABS: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'halfyear', 'annual'];

export default function Rooms() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const persona = useProfileStore((s) => s.persona);
  const completions = useTaskStore((s) => s.completions);
  const assignments = useTaskStore((s) => s.assignments);
  const completeTask = useTaskStore((s) => s.completeTask);
  const uncompleteTask = useTaskStore((s) => s.uncompleteTask);
  const assignTask = useTaskStore((s) => s.assignTask);
  const unassignTask = useTaskStore((s) => s.unassignTask);
  const schedules = useTaskStore((s) => s.schedules);
  const setSchedule = useTaskStore((s) => s.setSchedule);
  const addCustomTask = useTaskStore((s) => s.addCustomTask);
  const removeCustomTask = useTaskStore((s) => s.removeCustomTask);
  const customTasks = useTaskStore((s) => s.customTasks);
  const members = useCrewStore((s) => s.members);
  const showToast = useUIStore((s) => s.showToast);
  const allTasks = useAllTasks();

  const [activeFreq, setActiveFreq] = useState<Frequency>('daily');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', description: '', instructions: '', frequency: 'weekly' as Frequency, xp: 10 });

  const selectedRoom = ROOMS.find((r) => r.id === roomId);

  const handleComplete = useCallback((taskId: string) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    const memberId = members[0]?.id || 'self';
    completeTask(taskId, memberId, task.xp, task.frequency);
    showToast(getRandomCompletionMessage(persona), 'success');
    if (persona === 'rookie') setShowConfetti(true);
    else if (persona === 'agent') { setShowStamp(true); setTimeout(() => setShowStamp(false), 1500); }
  }, [members, completeTask, persona, showToast, allTasks]);

  const handleUncomplete = useCallback((taskId: string) => {
    const record = completions.find((c) => c.taskId === taskId);
    if (record) uncompleteTask(record.id);
  }, [completions, uncompleteTask]);

  const getAssignedTo = (taskId: string) =>
    assignments.filter((a) => a.taskId === taskId).map((a) => a.memberId);

  const getLastCompleted = (taskId: string): string | null => {
    const records = completions.filter((c) => c.taskId === taskId);
    if (records.length === 0) return null;
    return records.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0].completedAt;
  };

  // Room Detail View
  if (selectedRoom) {
    const roomTasks = allTasks.filter((t) => t.roomId === selectedRoom.id && t.frequency === activeFreq);
    const availableFreqs = FREQUENCY_TABS.filter((f) =>
      allTasks.some((t) => t.roomId === selectedRoom.id && t.frequency === f)
    );
    const detailTask = allTasks.find((t) => t.id === selectedTask);
    const isCustom = (id: string) => customTasks.some((t) => t.id === id);

    const handleAddCustomTask = () => {
      if (!newTask.name.trim()) return;
      const task: TaskTemplate = {
        id: `custom_${selectedRoom.id}_${Date.now()}`,
        roomId: selectedRoom.id,
        frequency: newTask.frequency,
        name: newTask.name.trim(),
        codeName: newTask.name.trim(),
        description: newTask.description.trim() || newTask.name.trim(),
        instructions: newTask.instructions.trim() || newTask.name.trim(),
        xp: newTask.xp,
      };
      addCustomTask(task);
      setNewTask({ name: '', description: '', instructions: '', frequency: 'weekly', xp: 10 });
      setShowAddTask(false);
      showToast('Custom task added!', 'success');
    };

    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        <MissionStamp show={showStamp} />

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gold hover:text-gold-bright mb-4 text-sm">
          <ArrowLeft size={16} /> Back to Map
        </button>

        {/* Room header with image */}
        <div className="clue-card overflow-hidden mb-4">
          {ROOM_IMAGES[selectedRoom.id] && (
            <div className="h-32 overflow-hidden relative">
              <img
                src={ROOM_IMAGES[selectedRoom.id]}
                alt={selectedRoom.name}
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 to-transparent" />
            </div>
          )}
          <div className="flex items-center gap-3 p-3 -mt-8 relative z-10">
            <span className="text-3xl">{selectedRoom.icon}</span>
            <div>
              <h1 className="text-lg font-bold text-gold" style={{ fontFamily: 'var(--font-family-serif)' }}>{getRoomDisplayName(selectedRoom, persona)}</h1>
              <p className="text-xs text-text-muted">{selectedRoom.description}</p>
            </div>
          </div>
        </div>

        {/* Frequency Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {availableFreqs.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFreq(f)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap',
                activeFreq === f ? 'bg-accent text-white' : 'bg-bg-card text-text-muted hover:text-text'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {roomTasks.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No tasks for this frequency.</p>
          ) : (
            roomTasks.map((task) => {
              const completed = !isTaskDue(task, completions);
              return (
                <div key={task.id} className="relative">
                  <TaskCard
                    task={task}
                    isCompleted={completed}
                    assignedTo={getAssignedTo(task.id)}
                    lastCompleted={getLastCompleted(task.id)}
                    onComplete={() => completed ? handleUncomplete(task.id) : handleComplete(task.id)}
                    onShowDetail={() => setSelectedTask(task.id)}
                  />
                  {isCustom(task.id) && (
                    <button
                      onClick={() => { removeCustomTask(task.id); showToast('Task removed', 'success'); }}
                      className="absolute top-2 right-2 p-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors"
                      title="Delete custom task"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add Custom Task Button */}
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-accent/30 text-accent text-sm font-medium flex items-center justify-center gap-2 hover:border-accent/60 hover:bg-accent/5 transition-all"
        >
          <Plus size={16} /> Add Custom Task
        </button>

        {/* Add Task Modal */}
        <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Add Custom Task">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Task Name *</label>
              <input
                type="text"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="e.g., Wipe down shelves"
                className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Description</label>
              <input
                type="text"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Short description of the task"
                className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Instructions (one step per line)</label>
              <textarea
                value={newTask.instructions}
                onChange={(e) => setNewTask({ ...newTask, instructions: e.target.value })}
                placeholder={"Step 1\nStep 2\nStep 3"}
                rows={3}
                className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-text-muted block mb-1">Frequency</label>
                <select
                  value={newTask.frequency}
                  onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as Frequency })}
                  className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent [&>option]:bg-[#1a1a24] [&>option]:text-[#f0e6d3]"
                >
                  {FREQUENCY_TABS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="text-xs font-medium text-text-muted block mb-1">XP</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newTask.xp}
                  onChange={(e) => setNewTask({ ...newTask, xp: parseInt(e.target.value) || 5 })}
                  className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <button
              onClick={handleAddCustomTask}
              disabled={!newTask.name.trim()}
              className="w-full py-2.5 rounded-lg bg-accent text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-glow transition-colors"
            >
              Add Task
            </button>
          </div>
        </Modal>

        <Modal isOpen={!!detailTask} onClose={() => { setSelectedTask(null); setShowSchedulePopup(false); }} title={detailTask?.name || ''}>
          {detailTask && (() => {
            const detailSchedule = schedules.find((s) => s.taskId === detailTask.id);
            const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const taskAssignments = assignments.filter((a) => a.taskId === detailTask.id);
            const assignedMemberIds = taskAssignments.map((a) => a.memberId);
            const assignedMembers = members.filter((m) => assignedMemberIds.includes(m.id));
            const availableMembers = members.filter((m) => !assignedMemberIds.includes(m.id));
            return (
            <div className="space-y-4">
              <p className="text-text-muted text-sm">{detailTask.description}</p>

              {/* Instructions */}
              <div>
                <h3 className="text-xs font-bold text-text uppercase mb-2">Instructions</h3>
                <ol className="space-y-1.5 list-none">
                  {detailTask.instructions.split('\n').filter(Boolean).map((step, i) => (
                    <li key={i} className="text-sm text-text-muted flex gap-2">
                      <span className="text-accent font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{step.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Assign to Crew */}
              {members.length > 0 && (
                <div className="bg-mahogany/20 border border-gold/10 rounded-lg p-3">
                  <h3 className="text-xs font-bold text-gold uppercase mb-2 flex items-center gap-1.5">
                    <UserPlus size={12} className="text-gold" /> Assign to Crew
                  </h3>
                  <>
                    {assignedMembers.length === 0 && (
                      <p className="text-xs text-text-muted italic">No one assigned yet</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {assignedMembers.map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-bg-secondary px-2 py-1 rounded text-text">
                          {m.name}
                          <button
                            onClick={() => unassignTask(detailTask.id, m.id)}
                            className="ml-1 text-text-muted hover:text-accent"
                            aria-label={`Remove ${m.name}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    {availableMembers.length > 0 && (
                      <select
                        className="w-full text-sm bg-bg-secondary text-text rounded px-2 py-1 hover:bg-accent/20 [&>option]:bg-[#1a1a24] [&>option]:text-[#f0e6d3]"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) assignTask(detailTask.id, e.target.value);
                        }}
                      >
                        <option value="">+ Assign crew member…</option>
                        {availableMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    )}
                  </>
                </div>
              )}

              {/* Schedule Task button + inline schedule badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs bg-bg-card px-2 py-1 rounded text-text-muted">{detailTask.frequency}</span>
                <span className="text-xs bg-warning/20 px-2 py-1 rounded text-warning">+{detailTask.xp} XP</span>
                {detailSchedule?.scheduledDate && (
                  <span className="text-xs bg-accent/20 px-2 py-1 rounded text-accent">
                    📅 {new Date(detailSchedule.scheduledDate + 'T00:00').toLocaleDateString()}
                  </span>
                )}
                {!detailSchedule?.scheduledDate && detailSchedule?.scheduledDay !== null && detailSchedule?.scheduledDay !== undefined && (
                  <span className="text-xs bg-accent/20 px-2 py-1 rounded text-accent">
                    📅 {detailTask.frequency === 'weekly' ? DAY_NAMES[detailSchedule.scheduledDay] : `Day ${detailSchedule.scheduledDay}`}
                  </span>
                )}
                {detailTask.frequency !== 'daily' && (
                  <button
                    onClick={() => setShowSchedulePopup(true)}
                    className="text-xs bg-gold/20 text-gold border border-gold/40 px-3 py-1 rounded-lg hover:bg-gold/30 transition-colors flex items-center gap-1"
                  >
                    <CalendarClock size={12} /> Schedule Task
                  </button>
                )}
              </div>

              {/* Last completed — bottom right */}
              <div className="flex justify-end">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <Clock size={10} />
                  {(() => {
                    const last = getLastCompleted(detailTask.id);
                    return last
                      ? `Last completed ${formatDistanceToNow(parseISO(last), { addSuffix: true })}`
                      : 'Never completed';
                  })()}
                </span>
              </div>

              {/* Schedule Popup */}
              {showSchedulePopup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowSchedulePopup(false)}>
                  <div className="bg-bg-primary border-2 border-gold/40 rounded-xl p-5 w-[90%] max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-sm font-bold text-gold uppercase mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
                      <CalendarClock size={16} className="text-gold" /> Schedule Task
                    </h3>

                    {detailTask.frequency === 'weekly' && (
                      <div className="mb-4">
                        <p className="text-[11px] text-text-muted mb-2">Which day should this be done?</p>
                        <div className="flex gap-1">
                          {DAY_NAMES.map((day, i) => (
                            <button
                              key={day}
                              onClick={() => setSchedule(detailTask.id, i, detailSchedule?.reminderTime || null, null)}
                              className={clsx(
                                'flex-1 py-2 rounded text-[11px] font-medium transition-colors',
                                detailSchedule?.scheduledDay === i && !detailSchedule?.scheduledDate
                                  ? 'bg-accent text-white'
                                  : 'bg-bg-card text-text-muted hover:text-text'
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailTask.frequency === 'monthly' && (
                      <div className="mb-4">
                        <p className="text-[11px] text-text-muted mb-2">Day of month:</p>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <button
                              key={day}
                              onClick={() => setSchedule(detailTask.id, day, detailSchedule?.reminderTime || null, null)}
                              className={clsx(
                                'py-1.5 rounded text-[11px] font-medium transition-colors',
                                detailSchedule?.scheduledDay === day && !detailSchedule?.scheduledDate
                                  ? 'bg-accent text-white'
                                  : 'bg-bg-card text-text-muted hover:text-text'
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specific date */}
                    <div className="mb-4">
                      <p className="text-[11px] text-text-muted mb-1">Schedule for a specific date:</p>
                      <input
                        type="date"
                        value={detailSchedule?.scheduledDate || ''}
                        onChange={(e) => {
                          const dateVal = e.target.value || null;
                          setSchedule(detailTask.id, dateVal ? null : detailSchedule?.scheduledDay ?? null, detailSchedule?.reminderTime || null, dateVal);
                        }}
                        className="bg-bg-card border border-gold/20 rounded-lg px-3 py-2 text-sm text-text w-full focus:outline-none focus:border-gold [color-scheme:dark]"
                      />
                      {detailSchedule?.scheduledDate && (
                        <button
                          onClick={() => setSchedule(detailTask.id, detailSchedule?.scheduledDay ?? null, detailSchedule?.reminderTime || null, null)}
                          className="mt-1 text-[11px] text-red-400 hover:text-red-300 underline"
                        >
                          Clear specific date
                        </button>
                      )}
                    </div>

                    {/* Reminder time */}
                    <div className="mb-4">
                      <p className="text-[11px] text-text-muted mb-1">Reminder time:</p>
                      <input
                        type="time"
                        value={detailSchedule?.reminderTime || ''}
                        onChange={(e) => setSchedule(detailTask.id, detailSchedule?.scheduledDay ?? null, e.target.value || null, detailSchedule?.scheduledDate)}
                        className="bg-bg-card border border-gold/20 rounded-lg px-3 py-2 text-sm text-text w-full focus:outline-none focus:border-gold [color-scheme:dark]"
                      />
                    </div>

                    <button
                      onClick={() => setShowSchedulePopup(false)}
                      className="w-full py-2 bg-gold/20 text-gold border border-gold/40 rounded-lg text-sm font-bold hover:bg-gold/30 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
            );
          })()}
        </Modal>
      </div>
    );
  }

  // Room Grid — Interactive House Map
  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-text mb-4">
        {persona === 'agent' ? '🏢 Operation Zones' : persona === 'rookie' ? '🏠 Your Rooms' : '🏠 Crime Scenes'}
      </h1>

      {/* Quick access grid */}
      <div className="grid grid-cols-4 gap-2 mt-5">
        {ROOMS.map((room) => {
          const dueCount = allTasks.filter(
            (t) => t.roomId === room.id && isTaskDue(t, completions)
          ).length;

          return (
            <button
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              className="bg-bg-card border border-bg-card hover:border-accent/30 rounded-xl p-2 text-center transition-all relative"
            >
              <span className="text-lg block">{room.icon}</span>
              <p className="text-[9px] text-text-muted mt-0.5 truncate">{room.name.replace(' Room', '').replace('Primary ', '')}</p>
              {dueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                  {dueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
