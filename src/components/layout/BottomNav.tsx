import { NavLink } from 'react-router-dom';
import { ClipboardList, Home, CalendarDays, Users, BarChart3, Bell, UserCircle } from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/rooms', icon: ClipboardList, label: 'Rooms' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/crew', icon: Users, label: 'Crew' },
  { to: '/progress', icon: BarChart3, label: 'Progress' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
] as const;

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 wood-nav">
      <div className="flex justify-around items-center py-2 px-1 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-all text-xs',
                isActive 
                  ? 'text-gold-bright drop-shadow-[0_0_6px_rgba(201,168,76,0.5)]' 
                  : 'text-text-muted hover:text-gold'
              )
            }
          >
            <Icon size={18} />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
