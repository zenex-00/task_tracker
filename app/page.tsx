import { redirect } from 'next/navigation';

import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function HomePage() {
  const currentUser = await getCurrentUserWithProfile();
  if (!currentUser) {
    redirect('/login');
  }

  redirect(currentUser.profile?.is_admin ? '/admin/team' : '/taskboard');
}
