import { redirect } from 'next/navigation';

import { TaskboardScreen } from '@/components/taskboard/TaskboardScreen';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function TaskBoardPage() {
  const currentUser = await getCurrentUserWithProfile();
  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.profile?.is_admin) {
    redirect('/admin/team');
  }

  return <TaskboardScreen />;
}
