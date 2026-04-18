import { redirect } from 'next/navigation';

import { AdminCreateUserPage } from '@/components/admin/AdminCreateUserPage';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function AdminCreateUserRoutePage() {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.profile?.is_admin) {
    redirect('/taskboard');
  }

  return <AdminCreateUserPage />;
}
