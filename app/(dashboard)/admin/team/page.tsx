import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUserWithProfile } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';

type TaskRow = {
  user_id: string | null;
  project: string | null;
  hours_spent: number | string | null;
  status: string | null;
  completion_report?: {
    taskProgress?: number;
  } | null;
};

type TimeEntryRow = {
  user_id: string | null;
  project: string | null;
  hours: number | string | null;
};

type UserProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ProjectSummary = {
  project: string;
  totalHours: number;
  totalEntries: number;
  totalTasks: number;
  completedTasks: number;
  users: Set<string>;
};

type TeamMemberSummary = {
  userId: string;
  fullName: string;
  email: string;
  hours: number;
  entries: number;
  tasks: number;
  completedTasks: number;
};

function parseHours(value: number | string | null | undefined): number {
  return Number.parseFloat(String(value ?? 0)) || 0;
}

function normalizeProject(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'General';
}

function isTaskCompleted(task: TaskRow): boolean {
  const progress = task.completion_report?.taskProgress;
  if (typeof progress === 'number' && Number.isFinite(progress)) return progress >= 100;
  return task.status === 'Completed';
}

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.profile?.is_admin) {
    redirect('/taskboard');
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return (
      <section className="view active">
        <div className="section-header">
          <div>
            <h2 className="section-title">Team Progress</h2>
            <p className="section-subtitle">{error instanceof Error ? error.message : 'Missing admin configuration.'}</p>
          </div>
          <Link href="/admin/users" className="btn-secondary btn-sm">
            Users
          </Link>
        </div>
      </section>
    );
  }

  const { data: taskRows, error: taskError } = await adminClient
    .from('tasks')
    .select('user_id, project, hours_spent, status, completion_report');

  const { data: entryRows, error: entryError } = await adminClient
    .from('time_entries')
    .select('user_id, project, hours');

  const { data: usersRows, error: usersError } = await adminClient
    .from('user_profiles')
    .select('id, first_name, last_name, email');

  const dependencyError =
    taskError?.message?.includes('user_id') || entryError?.message?.includes('user_id')
      ? 'Team progress requires `user_id` columns on `tasks` and `time_entries`.'
      : null;

  const queryError = taskError?.message || entryError?.message || usersError?.message || dependencyError;

  if (queryError) {
    return (
      <section className="view active">
        <div className="section-header">
          <div>
            <h2 className="section-title">Team Progress</h2>
            <p className="section-subtitle">{queryError}</p>
          </div>
          <Link href="/admin/users" className="btn-secondary btn-sm">
            Users
          </Link>
        </div>
      </section>
    );
  }

  const tasks = (taskRows || []) as TaskRow[];
  const entries = (entryRows || []) as TimeEntryRow[];
  const users = (usersRows || []) as UserProfileRow[];

  const usersById = new Map<string, UserProfileRow>(users.map((user) => [user.id, user]));
  const projectMap = new Map<string, ProjectSummary>();

  for (const task of tasks) {
    const project = normalizeProject(task.project);
    const current = projectMap.get(project) || {
      project,
      totalHours: 0,
      totalEntries: 0,
      totalTasks: 0,
      completedTasks: 0,
      users: new Set<string>(),
    };

    current.totalTasks += 1;
    current.totalHours += parseHours(task.hours_spent);
    if (isTaskCompleted(task)) current.completedTasks += 1;
    if (task.user_id) current.users.add(task.user_id);
    projectMap.set(project, current);
  }

  for (const entry of entries) {
    const project = normalizeProject(entry.project);
    const current = projectMap.get(project) || {
      project,
      totalHours: 0,
      totalEntries: 0,
      totalTasks: 0,
      completedTasks: 0,
      users: new Set<string>(),
    };

    current.totalEntries += 1;
    current.totalHours += parseHours(entry.hours);
    if (entry.user_id) current.users.add(entry.user_id);
    projectMap.set(project, current);
  }

  const projects = [...projectMap.values()].sort((a, b) => b.totalHours - a.totalHours);
  const resolvedSearchParams = await searchParams;
  const requestedProject = Array.isArray(resolvedSearchParams.project) ? resolvedSearchParams.project[0] : resolvedSearchParams.project;
  const selectedProject = requestedProject && projectMap.has(requestedProject) ? requestedProject : projects[0]?.project;

  const memberMap = new Map<string, TeamMemberSummary>();
  if (selectedProject) {
    for (const entry of entries) {
      if (normalizeProject(entry.project) !== selectedProject || !entry.user_id) continue;
      const profile = usersById.get(entry.user_id);
      const current = memberMap.get(entry.user_id) || {
        userId: entry.user_id,
        fullName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
        email: profile?.email || '-',
        hours: 0,
        entries: 0,
        tasks: 0,
        completedTasks: 0,
      };
      current.hours += parseHours(entry.hours);
      current.entries += 1;
      memberMap.set(entry.user_id, current);
    }

    for (const task of tasks) {
      if (normalizeProject(task.project) !== selectedProject || !task.user_id) continue;
      const profile = usersById.get(task.user_id);
      const current = memberMap.get(task.user_id) || {
        userId: task.user_id,
        fullName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
        email: profile?.email || '-',
        hours: 0,
        entries: 0,
        tasks: 0,
        completedTasks: 0,
      };
      current.tasks += 1;
      if (isTaskCompleted(task)) current.completedTasks += 1;
      memberMap.set(task.user_id, current);
    }
  }

  const members = [...memberMap.values()].sort((a, b) => b.hours - a.hours);
  const totalHours = projects.reduce((sum, project) => sum + project.totalHours, 0);
  const totalTasks = projects.reduce((sum, project) => sum + project.totalTasks, 0);
  const totalEntries = projects.reduce((sum, project) => sum + project.totalEntries, 0);

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Team Progress</h2>
          <p className="section-subtitle">Project-wide hours and member progress for admins.</p>
        </div>
        <Link href="/admin/users" className="btn-secondary btn-sm">
          Users
        </Link>
      </div>

      <div className="metric-row progress-kpis">
        <article className="metric-card">
          <span className="mc-value">{projects.length}</span>
          <span className="mc-label">Projects</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totalHours.toFixed(2)}h</span>
          <span className="mc-label">Total Hours</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totalEntries}</span>
          <span className="mc-label">Time Entries</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totalTasks}</span>
          <span className="mc-label">Tasks</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="card full-span">
          <div className="section-header">
            <div>
              <h2 className="section-title">Project Summary</h2>
              <p className="section-subtitle">Select a specific project to view team progress details.</p>
            </div>
          </div>

          <div className="filters">
            {projects.map((project) => (
              <Link
                key={project.project}
                href={`/admin/team?project=${encodeURIComponent(project.project)}`}
                className={selectedProject === project.project ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                {project.project}
              </Link>
            ))}
          </div>

          <div className="table-container mt-4">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Entries</th>
                  <th>Tasks</th>
                  <th>Completed</th>
                  <th>Members</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((project) => (
                    <tr key={project.project}>
                      <td>{project.project}</td>
                      <td>{project.totalHours.toFixed(2)}h</td>
                      <td>{project.totalEntries}</td>
                      <td>{project.totalTasks}</td>
                      <td>{project.completedTasks}</td>
                      <td>{project.users.size}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No project data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card full-span">
          <div className="section-header">
            <div>
              <h2 className="section-title">Project Members: {selectedProject || 'N/A'}</h2>
              <p className="section-subtitle">Click a user to open their full progress page.</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Hours</th>
                  <th>Entries</th>
                  <th>Tasks</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.length ? (
                  members.map((member) => (
                    <tr key={member.userId}>
                      <td>{member.fullName}</td>
                      <td>{member.email}</td>
                      <td>{member.hours.toFixed(2)}h</td>
                      <td>{member.entries}</td>
                      <td>{member.tasks}</td>
                      <td>{member.completedTasks}</td>
                      <td>
                        <Link href={`/admin/users/${member.userId}/progress`} className="btn-secondary btn-sm">
                          View Progress
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No member progress found for this project.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
