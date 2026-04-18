'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';
import { getTodayStr } from '@/lib/utils/date';
import { useAppStore } from '@/lib/store/useAppStore';
import type { TeamRole } from '@/types';

import { SyncDot } from '@/components/ui/SyncDot';

interface TopBarProps {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    role: TeamRole;
    isAdmin: boolean;
  };
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const timeEntries = useAppStore((s) => s.timeEntries);
  const today = getTodayStr();
  const todayHours = timeEntries.filter((entry) => entry.date === today).reduce((sum, entry) => sum + entry.hours, 0);

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || 'Failed to logout.');
      return;
    }

    toast.success('Logged out.');
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="top-bar">
      <div className="logo">
        <div className="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="16" x2="13" y2="16" />
          </svg>
        </div>
        <h1>
          Freelance<span>Tracker</span>
        </h1>
        <SyncDot />
      </div>

      <div className="top-stats">
        <div className="stat-badge">
          <span className="stat-label">Date</span>
          <strong>{today}</strong>
        </div>
        <div className="stat-badge">
          <span className="stat-label">Today</span>
          <strong className="highlight">{todayHours.toFixed(2)}h</strong>
        </div>
        <div className="stat-badge user-badge">
          <span className="stat-label">User</span>
          <strong>{`${user.firstName} ${user.lastName}`}</strong>
          <small>{user.role}</small>
        </div>
        <div className="top-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={() => router.push('/settings')}>
            Settings
          </button>
          {user.isAdmin ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => router.push('/admin/users')}>
              Admin
            </button>
          ) : null}
          <button type="button" className="btn-ghost btn-sm" onClick={onLogout} title={user.email}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
