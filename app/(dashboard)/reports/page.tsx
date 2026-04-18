import { redirect } from 'next/navigation';

import { ReportsScreen } from '@/components/reports/ReportsScreen';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function ReportsPage() {
  const currentUser = await getCurrentUserWithProfile();
  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.profile?.is_admin) {
    redirect('/admin/team');
  }

  return <ReportsScreen />;
}
