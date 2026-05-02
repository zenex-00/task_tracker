import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types';

function getAdminFlagFromAuthClaims(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): boolean {
  const appMetaIsAdmin = user.app_metadata?.is_admin;
  const userMetaIsAdmin = user.user_metadata?.is_admin;
  return appMetaIsAdmin === true || userMetaIsAdmin === true;
}

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
    .select('id, email, first_name, last_name, job_role, is_admin, projects, created_at')
    .eq('id', data.user.id)
    .maybeSingle<UserProfile>();
  const isAdminFromClaims = getAdminFlagFromAuthClaims(data.user);

  const firstNameFromMeta = String(data.user.user_metadata?.first_name || '').trim();
  const lastNameFromMeta = String(data.user.user_metadata?.last_name || '').trim();
  const roleFromMeta = String(data.user.user_metadata?.job_role || '').trim();

  const effectiveProfile: UserProfile | null = profile
    ? {
        ...profile,
        is_admin: profile.is_admin || isAdminFromClaims,
      }
    : {
        id: data.user.id,
        email: data.user.email || '',
        first_name: firstNameFromMeta || 'Team',
        last_name: lastNameFromMeta || 'Member',
        job_role: roleFromMeta || 'Other',
        is_admin: isAdminFromClaims,
        projects: null,
      };

  return {
    userId: data.user.id,
    email: data.user.email || '',
    profile: effectiveProfile,
  };
}
