import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUserWithProfile } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CompletionReport, ReportAttachment } from '@/types';

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

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

export default async function AdminUserProgressPage({ params }: { params: { id: string } }) {
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
  const userId = params.id;

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
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
  const reports = tasks.filter((task) => task.completion_report);
  const reportsWithAttachments = await Promise.all(
    reports.map(async (task) => {
      const attachments = task.completion_report?.attachments || [];
      const resolvedAttachments = await resolveReportAttachments(adminClient, attachments);
      return { task, resolvedAttachments };
    }),
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
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.name}</td>
                      <td>{task.project || '-'}</td>
                      <td>{task.status || '-'}</td>
                      <td>{parseHours(task.hours_spent).toFixed(2)}h</td>
                      <td>{task.created_date || '-'}</td>
                      <td>{task.date_completed || '-'}</td>
                    </tr>
                  ))
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
              <p className="section-subtitle">All submitted reports and notes by this user.</p>
            </div>
          </div>
          {reports.length ? (
            <div className="progress-reports">
              {reportsWithAttachments.map(({ task, resolvedAttachments }) => (
                <article key={task.id} className="progress-report-card">
                  <h3>
                    {task.name} <span className="text-muted">({task.project || 'General'})</span>
                  </h3>
                  <p className="text-muted">Completed: {task.date_completed || '-'}</p>
                  <div className="progress-notes">
                    {Object.entries(task.completion_report?.dynamicNotes || {}).map(([label, value]) => (
                      <div key={label} className="progress-note-item">
                        <strong>{label}:</strong> {value || '-'}
                      </div>
                    ))}
                  </div>
                  {resolvedAttachments.length ? (
                    <div className="progress-attachments">
                      <strong>Attachments</strong>
                      <ul>
                        {resolvedAttachments.map((attachment) => (
                          <li key={`${attachment.bucket}/${attachment.path}`}>
                            {attachment.resolvedUrl ? (
                              <a href={attachment.resolvedUrl} target="_blank" rel="noreferrer">
                                {attachment.name}
                              </a>
                            ) : (
                              <span>{attachment.name}</span>
                            )}{' '}
                            {attachment.fieldName ? <span className="text-muted">[{attachment.fieldName}]</span> : null}{' '}
                            <span className="text-muted">({formatFileSize(attachment.size)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted">No completion reports found.</p>
          )}
        </section>
      </div>
    </section>
  );
}

