'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/lib/store/useAppStore';
import type { UserProfile } from '@/types';

interface UserListItem extends UserProfile {}

export function AdminUsersPage() {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [assigningUser, setAssigningUser] = useState<UserListItem | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users', { method: 'GET' });
      const payload = (await response.json()) as { error?: string; users?: UserListItem[] };

      if (!response.ok || !payload.users) {
        toast.error(payload.error || 'Failed to fetch users.');
        return;
      }

      setUsers(payload.users);
    } catch {
      toast.error('Network error while fetching users.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(query) || user.email.toLowerCase().includes(query) || user.job_role.toLowerCase().includes(query);
    });
  }, [users, search]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => user.is_admin).length;
  const totalMembers = totalUsers - totalAdmins;

  const onRemoveUser = async (user: UserListItem) => {
    const confirmed = window.confirm(`Remove user "${user.first_name} ${user.last_name}"?`);
    if (!confirmed) return;

    try {
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
    } catch {
      toast.error('Network error while removing user.');
    }
  };

  const onViewProgress = (user: UserListItem) => {
    router.push(`/admin/users/${user.id}/progress`);
  };

  const openAssignProjects = (user: UserListItem) => {
    setAssigningUser(user);
    setSelectedProjects(user.projects || []);
  };

  const toggleProjectSelection = (project: string) => {
    setSelectedProjects((prev) => (prev.includes(project) ? prev.filter((item) => item !== project) : [...prev, project]));
  };

  const onSaveProjectAssignments = async () => {
    if (!assigningUser) return;

    setIsSavingAssignments(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assigningUser.id, projects: selectedProjects }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error || 'Failed to assign projects.');
        return;
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === assigningUser.id ? { ...user, projects: [...selectedProjects] } : user)),
      );
      toast.success('Projects assigned successfully.');
      setAssigningUser(null);
    } catch {
      toast.error('Network error while assigning projects.');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Users</h2>
          <p className="section-subtitle">Full team directory. Open any user to see detailed progress.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => router.push('/admin/users/create')}>
          Create User
        </button>
      </div>

      <div className="metric-row progress-kpis admin-users-kpis">
        <article className="metric-card">
          <span className="mc-value">{totalUsers}</span>
          <span className="mc-label">Total Users</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totalMembers}</span>
          <span className="mc-label">Members</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totalAdmins}</span>
          <span className="mc-label">Admins</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{filteredUsers.length}</span>
          <span className="mc-label">Filtered</span>
        </article>
      </div>

      <section className="card admin-users-full-card">
        <div className="table-header admin-users-toolbar">
          <h2>Team Members</h2>
          <div className="filters">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or role..."
            />
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
                {filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} onClick={() => onViewProgress(user)} style={{ cursor: 'pointer' }}>
                      <td>{`${user.first_name} ${user.last_name}`}</td>
                      <td>{user.email}</td>
                      <td>{user.job_role}</td>
                      <td>{user.is_admin ? 'Admin' : 'User'}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              onViewProgress(user);
                            }}
                          >
                            View Progress
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssignProjects(user);
                            }}
                          >
                            Assign Projects
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
                    <td colSpan={5}>No users found for the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(assigningUser)}
        onClose={() => {
          if (isSavingAssignments) return;
          setAssigningUser(null);
        }}
        title={assigningUser ? `Assign Projects: ${assigningUser.first_name} ${assigningUser.last_name}` : 'Assign Projects'}
      >
        <div className="projects-list">
          {projects.length ? (
            projects.map((project) => (
              <label key={project} className="project-assignment-row">
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project)}
                  onChange={() => toggleProjectSelection(project)}
                />
                <span>{project}</span>
              </label>
            ))
          ) : (
            <p className="text-muted">No projects available. Create projects first from Admin Projects.</p>
          )}
        </div>
        <button
          type="button"
          className="btn-primary btn-large w-full mt-4"
          disabled={isSavingAssignments}
          onClick={() => {
            void onSaveProjectAssignments();
          }}
        >
          {isSavingAssignments ? 'Saving...' : 'Save Assignments'}
        </button>
      </Modal>
    </section>
  );
}
