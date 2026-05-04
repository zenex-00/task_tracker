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
  role?: string;
};

type UpdateUserProjectsBody = {
  userId?: string;
  projects?: string[];
};

function isMissingProjectsColumnError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('projects') && (lower.includes('column') || lower.includes('schema cache'));
}

async function verifyAdmin() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: error instanceof Error ? error.message : 'Missing Supabase configuration.' },
        { status: 500 },
      ),
    };
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle<{ is_admin: boolean }>();

  const isAdminFromClaims =
    userData.user.app_metadata?.is_admin === true ||
    userData.user.user_metadata?.is_admin === true;
  const isAdmin = Boolean(profile?.is_admin) || isAdminFromClaims;

  if (profileError || !isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, userId: userData.user.id };
}

export async function GET() {
  const guard = await verifyAdmin();
  if (!guard.ok) {
    return guard.response;
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

  const { data, error } = await adminClient
    .from('user_profiles')
    .select('id, email, first_name, last_name, job_role, is_admin, projects, created_at')
    .order('created_at', { ascending: false });

  if (error && isMissingProjectsColumnError(error.message)) {
    const fallbackRes = await adminClient
      .from('user_profiles')
      .select('id, email, first_name, last_name, job_role, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (fallbackRes.error) {
      return NextResponse.json({ error: fallbackRes.error.message || 'Failed to fetch users' }, { status: 500 });
    }

    const usersWithoutProjects = ((fallbackRes.data || []) as UserProfile[]).map((user) => ({
      ...user,
      projects: null,
    }));
    return NextResponse.json({ users: usersWithoutProjects });
  }

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
  const rawRole = body.role;
  // New users are always created as non-admin users.
  const isAdmin = false;

  if (!email || !password || !firstName || !lastName || !rawRole) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  if (typeof rawRole !== 'string' || rawRole.trim() === '') {
    return NextResponse.json({ error: 'A valid role is required.' }, { status: 400 });
  }

  const role = rawRole.trim();
  if (role.length > 80) {
    return NextResponse.json({ error: 'Role must be 80 characters or fewer.' }, { status: 400 });
  }

  if (role === 'Other') {
    return NextResponse.json({ error: 'Please provide a specific role name instead of "Other".' }, { status: 400 });
  }

  const normalizedRole: TeamRole = TEAM_ROLES.includes(role as TeamRole) ? (role as TeamRole) : role;

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
      job_role: normalizedRole,
    },
  });

  if (userError || !userResult.user) {
    return NextResponse.json({ error: userError?.message || 'Failed to create auth user.' }, { status: 500 });
  }

  const profilePayload = {
    id: userResult.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    job_role: normalizedRole,
    is_admin: isAdmin,
    projects: null,
  };

  const { error: profileError } = await adminClient.from('user_profiles').upsert(profilePayload);

  if (profileError) {
    if (isMissingProjectsColumnError(profileError.message)) {
      const { error: legacyProfileError } = await adminClient.from('user_profiles').upsert({
        id: userResult.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        job_role: normalizedRole,
        is_admin: isAdmin,
      });

      if (!legacyProfileError) {
        return NextResponse.json({ success: true }, { status: 201 });
      }
    }
    await adminClient.auth.admin.deleteUser(userResult.user.id);
    return NextResponse.json({ error: profileError.message || 'Failed to create profile.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await verifyAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  let body: UpdateUserProjectsBody;
  try {
    body = (await request.json()) as UpdateUserProjectsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const userId = body.userId?.trim() || '';
  if (!userId) {
    return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  }

  if (!Array.isArray(body.projects)) {
    return NextResponse.json({ error: 'Projects must be an array.' }, { status: 400 });
  }

  const cleanProjects = [...new Set(body.projects.map((project) => project.trim()).filter(Boolean))];

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Missing admin configuration.' },
      { status: 500 },
    );
  }

  const { error } = await adminClient
    .from('user_profiles')
    .update({ projects: cleanProjects })
    .eq('id', userId);

  if (error && isMissingProjectsColumnError(error.message)) {
    return NextResponse.json(
      { error: 'Projects assignment is unavailable until the `user_profiles.projects` migration is applied.' },
      { status: 400 },
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to update user projects.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const guard = await verifyAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id') || '';

  if (!userId) {
    return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  }

  if (userId === guard.userId) {
    return NextResponse.json({ error: 'You cannot remove your own account.' }, { status: 400 });
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

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to remove user.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
