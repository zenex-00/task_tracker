import { NextResponse } from 'next/server';

import { TEAM_ROLES } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { TeamRole, UserProfile } from '@/types';

type CreateUserBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: TeamRole;
};

async function verifyAdmin() {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle<{ is_admin: boolean }>();

  if (profileError || !profile?.is_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  const guard = await verifyAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, last_name, job_role, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ users: (data || []) as UserProfile[] });
}

export async function POST(request: Request) {
  const guard = await verifyAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || '';
  const password = body.password || '';
  const firstName = body.firstName?.trim() || '';
  const lastName = body.lastName?.trim() || '';
  const role = body.role;
  // New users are always created as non-admin users.
  const isAdmin = false;

  if (!email || !password || !firstName || !lastName || !role) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  if (!TEAM_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role selected.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Missing admin configuration.' },
      { status: 500 },
    );
  }

  const { data: userResult, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      job_role: role,
    },
  });

  if (userError || !userResult.user) {
    return NextResponse.json({ error: userError?.message || 'Failed to create auth user.' }, { status: 500 });
  }

  const { error: profileError } = await adminClient.from('user_profiles').upsert({
    id: userResult.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    job_role: role,
    is_admin: isAdmin,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userResult.user.id);
    return NextResponse.json({ error: profileError.message || 'Failed to create profile.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
