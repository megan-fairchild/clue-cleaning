import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProfileStore, useTaskStore, useCrewStore, useHydrated } from './store';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import ToastContainer from './components/shared/ToastContainer';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Calendar from './pages/Calendar';
import Crew from './pages/Crew';
import Progress from './pages/Progress';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';

export default function App() {
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateCrew = useCrewStore((s) => s.hydrate);
  const hydrated = useHydrated();

  useEffect(() => {
    hydrateProfile();
    hydrateTask();
    hydrateCrew();
  }, [hydrateProfile, hydrateTask, hydrateCrew]);

  if (!hydrated) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-20 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:roomId" element={<Rooms />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/crew" element={<Crew />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <BottomNav />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔍</div>
        <p className="text-text-muted">Loading crime scenes...</p>
      </div>
    </div>
  );
}
