import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types';

export async function getCurrentUserWithProfile(): Promise<{
  userId: string;
  email: string;
  profile: UserProfile | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, last_name, job_role, is_admin, created_at')
    .eq('id', data.user.id)
    .maybeSingle<UserProfile>();

  return {
    userId: data.user.id,
    email: data.user.email || '',
    profile: profile || null,
  };
}
