'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { TEAM_ROLES } from '@/lib/auth/roles';
import type { TeamRole } from '@/types';

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

export function AdminCreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(initialForm);
  const [customRole, setCustomRole] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    const finalRole = form.role === 'Other' ? customRole.trim() : form.role;

    if (!finalRole) {
      toast.error('Please specify a role.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: finalRole }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error || 'Failed to create user.');
        return;
      }

      toast.success('User created successfully.');
      router.push('/admin/users');
      router.refresh();
    } catch {
      toast.error('Network error while creating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Create User</h2>
          <p className="section-subtitle">Create a new internal account and assign role access.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => router.push('/admin/users')}>
          Back To Users
        </button>
      </div>

      <section className="card admin-create-card">
        <form className="admin-user-form admin-user-form-wide" onSubmit={onSubmit}>
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

          {form.role === 'Other' && (
            <div className="form-group slide-up">
              <label htmlFor="custom-role">Custom Role Name</label>
              <input
                id="custom-role"
                type="text"
                value={customRole}
                onChange={(event) => setCustomRole(event.target.value)}
                placeholder="Enter custom job role..."
                required
              />
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </section>
    </section>
  );
}
