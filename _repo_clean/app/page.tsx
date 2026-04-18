import { redirect } from 'next/navigation';

import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function HomePage() {
  const currentUser = await getCurrentUserWithProfile();
  redirect(currentUser ? '/taskboard' : '/login');
}
