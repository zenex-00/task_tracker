'use client';

import type { ReactNode } from 'react';

import { BottomTabs } from '@/components/layout/BottomTabs';
import { TopBar } from '@/components/layout/TopBar';
import { useLoadData } from '@/hooks/useLoadData';
import type { TeamRole } from '@/types';

interface DashboardShellProps {
  children: ReactNode;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    role: TeamRole;
    isAdmin: boolean;
  };
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  useLoadData();

  return (
    <>
      <TopBar user={user} />
      <main className="content">{children}</main>
      <BottomTabs isAdmin={user.isAdmin} />
    </>
  );
}
