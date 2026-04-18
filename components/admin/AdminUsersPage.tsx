'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { TEAM_ROLES } from '@/lib/auth/roles';
import type { TeamRole, UserProfile } from '@/types';

interface UserListItem extends UserProfile {}

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: TeamRole;
}

const initialForm: CreateUserPayload = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'Full Stack Developer',
};

export function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(initialForm);

  const userCount = useMemo(() => users.length, [users]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const response = await fetch('/api/admin/users', { method: 'GET' });
    const payload = (await response.json()) as { error?: string; users?: UserListItem[] };
    setIsLoadingUsers(false);

    if (!response.ok || !payload.users) {
      toast.error(payload.error || 'Failed to fetch users.');
      return;
    }

    setUsers(payload.users);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(payload.error || 'Failed to create user.');
      return;
    }

    toast.success('User created successfully.');
    setForm(initialForm);
    void loadUsers();
  };

  const onRemoveUser = async (user: UserListItem) => {
    const confirmed = window.confirm(`Remove user "${user.first_name} ${user.last_name}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(payload.error || 'Failed to remove user.');
      return;
    }

    toast.success('User removed successfully.');
    void loadUsers();
  };

  const onViewProgress = (user: UserListItem) => {
    router.push(`/admin/users/${user.id}/progress`);
  };

  return (
    <div className="dashboard-grid admin-grid">
      <section className="card admin-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Create User</h2>
            <p className="section-subtitle">Create internal users with role and password.</p>
          </div>
        </div>

        <form className="admin-user-form" onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first-name">First Name</label>
              <input
                id="first-name"
                type="text"
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="last-name">Last Name</label>
              <input
                id="last-name"
                type="text"
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="new.user@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-password">Password</label>
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-role">Role</label>
            <select
              id="user-role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as TeamRole }))}
            >
              {TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </section>

      <section className="card admin-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Existing Users</h2>
            <p className="section-subtitle">{userCount} users in the system.</p>
          </div>
        </div>

        {isLoadingUsers ? (
          <p className="text-muted">Loading users...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{`${user.first_name} ${user.last_name}`}</td>
                      <td>{user.email}</td>
                      <td>{user.job_role}</td>
                      <td>{user.is_admin ? 'Admin' : 'User'}</td>
                      <td>
                        <div className="admin-actions">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => onViewProgress(user)}>
                            View Progress
                          </button>
                          <button type="button" className="btn-danger-soft" onClick={() => void onRemoveUser(user)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
