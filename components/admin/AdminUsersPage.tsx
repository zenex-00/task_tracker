'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { UserProfile } from '@/types';

interface UserListItem extends UserProfile {}

export function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

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
    <div className="dashboard-grid">
      <section className="card admin-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Users</h2>
            <p className="section-subtitle">{userCount} users in the system. Click any user to view progress.</p>
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
                    <tr key={user.id} onClick={() => onViewProgress(user)} style={{ cursor: 'pointer' }}>
                      <td>{`${user.first_name} ${user.last_name}`}</td>
                      <td>{user.email}</td>
                      <td>{user.job_role}</td>
                      <td>{user.is_admin ? 'Admin' : 'User'}</td>
                      <td>
                        <div className="admin-actions">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => onViewProgress(user)}>
                            View Progress
                          </button>
                          <button
                            type="button"
                            className="btn-danger-soft"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onRemoveUser(user);
                            }}
                          >
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
