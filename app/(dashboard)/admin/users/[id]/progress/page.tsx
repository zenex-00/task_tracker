import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminUserSubmittedReports } from '@/components/reports/AdminUserSubmittedReports';
import { getCurrentUserWithProfile } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CompletionReport, ReportAttachment, Task, TimeEntry } from '@/types';

type TaskProgressRow = {
  id: string;
  name: string;
  project: string | null;
  hours_spent: number | string | null;
  status: string | null;
  created_date: string | null;
  date_completed: string | null;
  completion_report: CompletionReport | null;
};

type TimeEntryProgressRow = {
  id: string;
  date: string;
  hours: number | string | null;
  project: string | null;
  description: string | null;
};

type UserProfileRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_role: string;
  is_admin: boolean;
};

function parseHours(value: number | string | null | undefined): number {
  return Number.parseFloat(String(value ?? 0)) || 0;
}

function deriveTaskStatus(task: TaskProgressRow): 'Completed' | 'In Progress' | 'Not Started' {
  const progress = task.completion_report?.taskProgress;
  if (typeof progress === 'number' && Number.isFinite(progress)) {
    return progress >= 100 ? 'Completed' : 'In Progress';
  }
  if (task.status === 'Completed') return 'Completed';
  if (task.status === 'In Progress') return 'In Progress';
  return 'Not Started';
}

function getTaskProgress(task: TaskProgressRow): number {
  const rawProgress = task.completion_report?.taskProgress;
  const parsed = typeof rawProgress === 'number' ? rawProgress : Number.parseFloat(String(rawProgress ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function getProgressBadgeClass(progress: number): string {
  if (progress > 75) return 'badge-progress-high';
  if (progress >= 45) return 'badge-progress-mid';
  return 'badge-progress-low';
}

async function resolveReportAttachments(adminClient: ReturnType<typeof createAdminClient>, attachments: ReportAttachment[]) {
  if (!attachments.length) return [];

  const urlsByPath = new Map<string, string>();
  const bucketToPaths = new Map<string, string[]>();

  attachments.forEach((attachment) => {
    if (!bucketToPaths.has(attachment.bucket)) bucketToPaths.set(attachment.bucket, []);
    bucketToPaths.get(attachment.bucket)?.push(attachment.path);
  });

  await Promise.all(
    Array.from(bucketToPaths.entries()).map(async ([bucket, paths]) => {
      const { data } = await adminClient.storage.from(bucket).createSignedUrls(paths, 60 * 60);
      (data || []).forEach((item) => {
        if (item.path && item.signedUrl) urlsByPath.set(item.path, item.signedUrl);
      });
    }),
  );

  return attachments.map((attachment) => ({
    ...attachment,
    resolvedUrl: urlsByPath.get(attachment.path) || attachment.publicUrl || '',
  }));
}

export default async function AdminUserProgressPage({ params }: { params: Promise<{ id: string }> }) {
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
            <h2 className="section-title">User Progress</h2>
            <p className="section-subtitle">{error instanceof Error ? error.message : 'Missing admin configuration.'}</p>
          </div>
          <Link href="/admin/users" className="btn-secondary btn-sm">
            Back To Users
          </Link>
        </div>
      </section>
    );
  }
  const { id: userId } = await params;

  const { data: userProfile, error: userError } = await adminClient
    .from('user_profiles')
    .select('id, email, first_name, last_name, job_role, is_admin')
    .eq('id', userId)
    .maybeSingle<UserProfileRow>();

  if (userError || !userProfile) {
    return (
      <section className="view active">
        <div className="section-header">
          <div>
            <h2 className="section-title">User Progress</h2>
            <p className="section-subtitle">{userError?.message || 'User not found.'}</p>
          </div>
          <Link href="/admin/users" className="btn-secondary btn-sm">
            Back To Users
          </Link>
        </div>
      </section>
    );
  }

  const { data: tasksData, error: tasksError } = await adminClient
    .from('tasks')
    .select('id, name, project, hours_spent, status, created_date, date_completed, completion_report')
    .eq('user_id', userId)
    .order('created_date', { ascending: false });

  const { data: entriesData, error: entriesError } = await adminClient
    .from('time_entries')
    .select('id, date, hours, project, description')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  const scopeErrorMessage =
    tasksError?.message?.includes('user_id') || entriesError?.message?.includes('user_id')
      ? 'Per-user progress requires `user_id` columns on `tasks` and `time_entries`.'
      : '';
  const queryErrorMessage = tasksError?.message || entriesError?.message || scopeErrorMessage;

  const tasks = (tasksData || []) as TaskProgressRow[];
  const entries = (entriesData || []) as TimeEntryProgressRow[];

  const totalHours = entries.reduce((sum, entry) => sum + parseHours(entry.hours), 0);
  const completedTasks = tasks.filter((task) => deriveTaskStatus(task) === 'Completed').length;
  const reports = tasks.filter((task) => task.completion_report);
  const reportsWithAttachments = await Promise.all(
    reports.map(async (task) => {
      const attachments = task.completion_report?.attachments || [];
      const resolvedAttachments = await resolveReportAttachments(adminClient, attachments);
      return { task, resolvedAttachments };
    }),
  );

  const pdfTasks: Task[] = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    project: task.project || 'General',
    hoursSpent: parseHours(task.hours_spent),
    priority: 'Medium',
    status: deriveTaskStatus(task),
    dateCompleted: deriveTaskStatus(task) === 'Completed' ? task.date_completed : null,
    createdDate: task.created_date || '',
    completionReport: task.completion_report,
  }));

  const pdfEntries: TimeEntry[] = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    hours: parseHours(entry.hours),
    taskId: null,
    billable: true,
    project: entry.project || 'General',
    description: entry.description || '',
  }));

  const submittedFiles = reportsWithAttachments.flatMap(({ task, resolvedAttachments }) =>
    resolvedAttachments
      .filter((attachment) => Boolean(attachment.resolvedUrl))
      .map((attachment) => ({
        key: `${attachment.bucket}/${attachment.path}`,
        name: attachment.name,
        url: attachment.resolvedUrl || '',
        project: task.project || 'General',
        completedDate: task.date_completed || '-',
        taskName: task.name,
        fieldName: attachment.fieldName,
        size: attachment.size,
      })),
  );

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            Progress: {userProfile.first_name} {userProfile.last_name}
          </h2>
          <p className="section-subtitle">
            {userProfile.email} | {userProfile.job_role}
          </p>
        </div>
        <Link href="/admin/users" className="btn-secondary btn-sm">
          Back To Users
        </Link>
      </div>

      {queryErrorMessage ? (
        <div className="card">
          <p className="text-muted">{queryErrorMessage}</p>
        </div>
      ) : null}

      <div className="metric-row progress-kpis">
        <article className="metric-card">
          <span className="mc-value">{totalHours.toFixed(2)}h</span>
          <span className="mc-label">Total Hours</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{entries.length}</span>
          <span className="mc-label">Time Entries</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{tasks.length}</span>
          <span className="mc-label">Tasks</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{completedTasks}</span>
          <span className="mc-label">Completed</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="card full-span">
          <div className="section-header">
            <div>
              <h2 className="section-title">All Progress Hours</h2>
              <p className="section-subtitle">All logged time entries for this user.</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.length ? (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.project || '-'}</td>
                      <td>{parseHours(entry.hours).toFixed(2)}h</td>
                      <td>{entry.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No time entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card full-span">
          <div className="section-header">
            <div>
              <h2 className="section-title">Task Progress</h2>
              <p className="section-subtitle">All tasks and completion status for this user.</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Hours</th>
                  <th>Created</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length ? (
                  tasks.map((task) => {
                    const taskProgress = getTaskProgress(task);
                    return (
                      <tr key={task.id}>
                        <td>{task.name}</td>
                        <td>{task.project || '-'}</td>
                        <td>{deriveTaskStatus(task)}</td>
                        <td>{parseHours(task.hours_spent).toFixed(2)}h</td>
                        <td>{task.created_date || '-'}</td>
                        <td>
                          <span className={`badge ${getProgressBadgeClass(taskProgress)}`}>{Math.round(taskProgress)}%</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>No tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card full-span">
          <div className="section-header">
            <div>
              <h2 className="section-title">Completion Reports</h2>
              <p className="section-subtitle">Daily reports grouped by project and date.</p>
            </div>
          </div>
          {reports.length ? (
            <AdminUserSubmittedReports
              tasks={pdfTasks}
              timeEntries={pdfEntries}
              attachments={submittedFiles}
              reportUserName={`${userProfile.first_name} ${userProfile.last_name}`.trim() || userProfile.email}
            />
          ) : (
            <p className="text-muted">No completion reports found.</p>
          )}
        </section>
      </div>
    </section>
  );
}

