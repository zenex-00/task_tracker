import { redirect } from 'next/navigation';

import { AdminUsersPage } from '@/components/admin/AdminUsersPage';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function AdminUsersRoutePage() {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.profile?.is_admin) {
    redirect('/taskboard');
  }

  return <AdminUsersPage />;
}
