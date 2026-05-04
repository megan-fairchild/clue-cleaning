import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { useCrewStore, useTaskStore, useUIStore } from '../store';
import { PERSONAS } from '../data/personas';
import { TASK_TEMPLATES } from '../data/tasks';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { PersonaId } from '../types';
import Modal from '../components/shared/Modal';

export default function Crew() {
  const members = useCrewStore((s) => s.members);
  const addMember = useCrewStore((s) => s.addMember);
  const removeMember = useCrewStore((s) => s.removeMember);
  const completions = useTaskStore((s) => s.completions);
  const showToast = useUIStore((s) => s.showToast);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPersona, setNewPersona] = useState<PersonaId>('detective');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMember(newName.trim(), newPersona);
    showToast(`${newName.trim()} joined the crew!`, 'success');
    setNewName('');
    setShowAddModal(false);
  };

  const handleRemove = (id: string, name: string) => {
    removeMember(id);
    showToast(`${name} removed from crew`, 'info');
  };

  // Leaderboard
  const leaderboard = useMemo(() => {
    return [...members].sort((a, b) => {
      const aXP = completions.filter((c) => c.completedBy === a.id).reduce((s, c) => s + c.xpEarned, 0);
      const bXP = completions.filter((c) => c.completedBy === b.id).reduce((s, c) => s + c.xpEarned, 0);
      return bXP - aXP;
    });
  }, [members, completions]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...completions]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 10)
      .map((c) => {
        const member = members.find((m) => m.id === c.completedBy);
        const task = TASK_TEMPLATES.find((t) => t.id === c.taskId);
        return { ...c, memberName: member?.name || 'Unknown', taskName: task?.name || c.taskId };
      });
  }, [completions, members]);

  const getMedalIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text">👥 Crew</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent-glow transition-colors"
        >
          <UserPlus size={14} /> Add
        </button>
      </div>

      {/* Members */}
      {members.length === 0 ? (
        <div className="bg-bg-card rounded-xl p-8 text-center mb-6">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-text-muted text-sm">No crew members yet.</p>
          <p className="text-text-muted text-xs mt-1">Add members to assign tasks and track progress.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {members.map((member, i) => {
            const memberXP = completions.filter((c) => c.completedBy === member.id).reduce((s, c) => s + c.xpEarned, 0);
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-bg-card rounded-xl p-3 flex items-center gap-3"
              >
                <span className="text-xl">{PERSONAS[member.persona].icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{member.name}</p>
                  <p className="text-[10px] text-text-muted">{PERSONAS[member.persona].name} · {memberXP} XP</p>
                </div>
                <button
                  onClick={() => handleRemove(member.id, member.name)}
                  className="p-2 text-text-muted hover:text-accent transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 1 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
            <Trophy size={14} className="text-warning" /> Leaderboard
          </h2>
          <div className="space-y-1.5">
            {leaderboard.map((member, i) => {
              const memberXP = completions.filter((c) => c.completedBy === member.id).reduce((s, c) => s + c.xpEarned, 0);
              return (
                <div key={member.id} className="flex items-center gap-3 bg-bg-card rounded-lg px-3 py-2">
                  <span className="text-sm w-6">{getMedalIcon(i)}</span>
                  <span className="text-sm text-text flex-1">{member.name}</span>
                  <span className="text-xs text-warning font-mono">{memberXP} XP</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">📜 Recent Activity</h2>
          <div className="space-y-1.5">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-2 text-xs text-text-muted bg-bg-card rounded-lg px-3 py-2">
                <span className="text-success">✓</span>
                <span className="text-text">{activity.memberName}</span>
                <span>completed</span>
                <span className="text-text truncate flex-1">{activity.taskName}</span>
                <span className="whitespace-nowrap">{formatDistanceToNow(parseISO(activity.completedAt), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Crew Member">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-bg-card border border-bg-card rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-2">Persona</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.values(PERSONAS)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setNewPersona(p.id)}
                  className={clsx(
                    'p-3 rounded-lg border text-center transition-all',
                    newPersona === p.id
                      ? 'border-accent bg-accent/10'
                      : 'border-bg-card bg-bg-card hover:border-accent/30'
                  )}
                >
                  <span className="text-xl block mb-1">{p.icon}</span>
                  <span className="text-[10px] text-text-muted">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full bg-accent text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-glow transition-colors"
          >
            Add to Crew
          </button>
        </div>
      </Modal>
    </div>
  );
}
