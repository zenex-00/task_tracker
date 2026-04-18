import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import DashboardShell from '@/components/layout/DashboardShell';
import { DEFAULT_TEAM_ROLE } from '@/lib/auth/roles';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  const firstName = currentUser.profile?.first_name || 'Team';
  const lastName = currentUser.profile?.last_name || 'Member';
  const role = currentUser.profile?.job_role || DEFAULT_TEAM_ROLE;
  const isAdmin = Boolean(currentUser.profile?.is_admin);

  return (
    <DashboardShell
      user={{
        email: currentUser.email,
        firstName,
        lastName,
        role,
        isAdmin,
      }}
    >
      {children}
    </DashboardShell>
  );
}
