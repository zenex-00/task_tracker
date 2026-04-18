import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/LoginForm';
import { getCurrentUserWithProfile } from '@/lib/auth/server';

export default async function LoginPage() {
  const currentUser = await getCurrentUserWithProfile();
  if (currentUser) {
    redirect('/taskboard');
  }

  return <LoginForm />;
}
