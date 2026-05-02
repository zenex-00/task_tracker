import { redirect } from 'next/navigation';

import { AdminProjectsPage } from '@/components/admin/AdminProjectsPage';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function AdminProjectsRoutePage() {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.profile?.is_admin) {
    redirect('/taskboard');
  }

  return <AdminProjectsPage />;
}
