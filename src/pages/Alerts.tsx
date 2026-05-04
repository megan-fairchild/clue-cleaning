import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Clock, Info } from 'lucide-react';
import clsx from 'clsx';
import { getSetting, setSetting } from '../lib/db';
import type { ReminderSettings } from '../types';

export default function Alerts() {
  const [enabled, setEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState('08:00');
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [weeklyTime, setWeeklyTime] = useState('09:00');
  const [loaded, setLoaded] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    getSetting<ReminderSettings>('reminders').then((saved) => {
      if (saved) {
        setEnabled(saved.enabled);
        setDailyTime(saved.dailyTime);
        setWeeklyDay(saved.weeklyDay);
        setWeeklyTime(saved.weeklyTime);
      }
      setLoaded(true);
    });
  }, []);

  // Save settings whenever they change (after initial load)
  const saveSettings = useCallback(() => {
    setSetting('reminders', { enabled, dailyTime, weeklyDay, weeklyTime });
  }, [enabled, dailyTime, weeklyDay, weeklyTime]);

  useEffect(() => {
    if (!loaded) return;
    saveSettings();
  }, [loaded, saveSettings]);

  // Request notification permission when enabling
  const handleToggle = () => {
    const next = !enabled;
    if (next && 'Notification' in window) {
      Notification.requestPermission();
    }
    setEnabled(next);
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Crime Scene Clean', { body: 'This is a test reminder. Your alerts are working!' });
    } else if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('Crime Scene Clean', { body: 'This is a test reminder. Your alerts are working!' });
        }
      });
    }
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={20} className="text-accent" />
        <h1 className="text-lg font-bold text-text">Alerts & Reminders</h1>
      </div>

      {/* Enable toggle */}
      <div className="bg-bg-card rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? <Bell size={18} className="text-success" /> : <BellOff size={18} className="text-text-muted" />}
          <div>
            <p className="text-sm text-text font-medium">Push Notifications</p>
            <p className="text-[10px] text-text-muted">Get reminded about due tasks</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={clsx(
            'w-12 h-6 rounded-full transition-colors relative',
            enabled ? 'bg-success' : 'bg-bg-secondary'
          )}
        >
          <div
            className={clsx(
              'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
              enabled ? 'translate-x-6.5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* Daily reminder time */}
      <div className={clsx('bg-bg-card rounded-xl p-4 mb-4 transition-opacity', !enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-text-muted" />
          <p className="text-sm text-text font-medium">Daily Reminder</p>
        </div>
        <input
          type="time"
          value={dailyTime}
          onChange={(e) => setDailyTime(e.target.value)}
          className="bg-bg-secondary border border-bg-card rounded-lg px-3 py-2 text-sm text-text w-full focus:outline-none focus:border-accent"
        />
      </div>

      {/* Weekly reminder */}
      <div className={clsx('bg-bg-card rounded-xl p-4 mb-4 transition-opacity', !enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-text-muted" />
          <p className="text-sm text-text font-medium">Weekly Reminder</p>
        </div>
        <div className="flex gap-1 mb-3">
          {days.map((day, i) => (
            <button
              key={day}
              onClick={() => setWeeklyDay(i)}
              className={clsx(
                'flex-1 py-1.5 rounded text-[10px] font-medium transition-colors',
                weeklyDay === i ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted'
              )}
            >
              {day}
            </button>
          ))}
        </div>
        <input
          type="time"
          value={weeklyTime}
          onChange={(e) => setWeeklyTime(e.target.value)}
          className="bg-bg-secondary border border-bg-card rounded-lg px-3 py-2 text-sm text-text w-full focus:outline-none focus:border-accent"
        />
      </div>

      {/* Test notification button */}
      <div className={clsx('mb-4 transition-opacity', !enabled && 'opacity-50 pointer-events-none')}>
        <button
          onClick={sendTestNotification}
          className="w-full bg-accent text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          Test Notification
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-bg-card rounded-xl p-4 border border-warning/20">
        <Info size={14} className="text-warning mt-0.5 flex-shrink-0" />
        <p className="text-xs text-text-muted leading-relaxed">
          Notifications are best-effort in PWA mode. They rely on the Service Worker and browser
          permissions. Some devices may throttle or delay notifications when the app is in the background.
        </p>
      </div>
    </div>
  );
}
