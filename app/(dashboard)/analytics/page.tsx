import { redirect } from 'next/navigation';

import { AdminAnalyticsScreen } from '@/components/analytics/AdminAnalyticsScreen';
import { AnalyticsScreen } from '@/components/analytics/AnalyticsScreen';
import { getCurrentUserWithProfile } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';

type TaskRow = {
  user_id: string | null;
  name: string;
  project: string | null;
  hours_spent: number | string | null;
  status: string | null;
  completion_report?: {
    taskProgress?: number;
  } | null;
};
type MergedTaskRow = TaskRow & { mergedHoursSpent: number };

type EntryRow = {
  user_id: string | null;
  project: string | null;
  hours: number | string | null;
  date: string | null;
};

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
};

function parseHours(value: number | string | null | undefined): number {
  return Number.parseFloat(String(value ?? 0)) || 0;
}

function normalizeProject(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'General';
}

function isCompleted(task: TaskRow): boolean {
  const progress = task.completion_report?.taskProgress;
  if (typeof progress === 'number' && Number.isFinite(progress)) return progress >= 100;
  return task.status === 'Completed';
}

function isInProgress(task: TaskRow): boolean {
  if (isCompleted(task)) return false;
  return task.status === 'In Progress';
}

function normalizeTaskKeyValue(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function mergeTaskRows(rows: TaskRow[]): MergedTaskRow[] {
  const merged = new Map<string, MergedTaskRow>();

  for (const row of rows) {
    const key = `${row.user_id || 'unknown'}::${normalizeProject(row.project)}::${normalizeTaskKeyValue(row.name)}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, mergedHoursSpent: parseHours(row.hours_spent) });
      continue;
    }

    const nextHours = existing.mergedHoursSpent + parseHours(row.hours_spent);
    const existingProgress = existing.completion_report?.taskProgress ?? -1;
    const rowProgress = row.completion_report?.taskProgress ?? -1;
    if (rowProgress >= existingProgress) {
      merged.set(key, { ...row, mergedHoursSpent: nextHours });
    } else {
      existing.mergedHoursSpent = nextHours;
      merged.set(key, existing);
    }
  }

  return [...merged.values()];
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function AnalyticsPage() {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.profile?.is_admin) {
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return <AnalyticsScreen />;
    }

    const [tasksRes, entriesRes, usersRes] = await Promise.all([
      adminClient.from('tasks').select('user_id, name, project, hours_spent, status, completion_report'),
      adminClient.from('time_entries').select('user_id, project, hours, date'),
      adminClient.from('user_profiles').select('id, first_name, last_name'),
    ]);

    const tasks = mergeTaskRows((tasksRes.data || []) as TaskRow[]);
    const entries = (entriesRes.data || []) as EntryRow[];
    const users = (usersRes.data || []) as UserRow[];

    const namesByUserId = new Map<string, string>(
      users.map((user) => [user.id, `${user.first_name} ${user.last_name}`.trim() || 'Unknown User']),
    );

    const projectMap = new Map<string, { project: string; hours: number; completed: number; inProgress: number; tasks: number; users: Set<string> }>();
    for (const task of tasks) {
      const project = normalizeProject(task.project);
      const current = projectMap.get(project) || { project, hours: 0, completed: 0, inProgress: 0, tasks: 0, users: new Set<string>() };
      current.tasks += 1;
      if (isCompleted(task)) current.completed += 1;
      if (isInProgress(task)) current.inProgress += 1;
      if (task.user_id) current.users.add(task.user_id);
      projectMap.set(project, current);
    }

    for (const entry of entries) {
      const project = normalizeProject(entry.project);
      const current = projectMap.get(project) || { project, hours: 0, completed: 0, inProgress: 0, tasks: 0, users: new Set<string>() };
      current.hours += parseHours(entry.hours);
      if (entry.user_id) current.users.add(entry.user_id);
      projectMap.set(project, current);
    }

    const memberMap = new Map<string, { userId: string; name: string; hours: number; completed: number; inProgress: number }>();
    for (const entry of entries) {
      if (!entry.user_id) continue;
      const current = memberMap.get(entry.user_id) || {
        userId: entry.user_id,
        name: namesByUserId.get(entry.user_id) || 'Unknown User',
        hours: 0,
        completed: 0,
        inProgress: 0,
      };
      current.hours += parseHours(entry.hours);
      memberMap.set(entry.user_id, current);
    }

    for (const task of tasks) {
      if (!task.user_id || !isCompleted(task)) continue;
      const current = memberMap.get(task.user_id) || {
        userId: task.user_id,
        name: namesByUserId.get(task.user_id) || 'Unknown User',
        hours: 0,
        completed: 0,
        inProgress: 0,
      };
      current.completed += 1;
      memberMap.set(task.user_id, current);
    }

    for (const task of tasks) {
      if (!task.user_id || !isInProgress(task)) continue;
      const current = memberMap.get(task.user_id) || {
        userId: task.user_id,
        name: namesByUserId.get(task.user_id) || 'Unknown User',
        hours: 0,
        completed: 0,
        inProgress: 0,
      };
      current.inProgress += 1;
      memberMap.set(task.user_id, current);
    }

    const projects = [...projectMap.values()]
      .map((project) => ({
        project: project.project,
        hours: project.hours,
        completed: project.completed,
        inProgress: project.inProgress,
        tasks: project.tasks,
        members: project.users.size,
      }))
      .sort((a, b) => b.hours - a.hours);
    const members = [...memberMap.values()].sort((a, b) => b.hours - a.hours);

    const membersDetailed = members.map((member) => {
      const taskCount = tasks.filter((task) => task.user_id === member.userId).length;
      return {
        name: member.name,
        hours: member.hours,
        completed: member.completed,
        inProgress: member.inProgress,
        tasks: taskCount,
      };
    });

    const last7 = dateDaysAgo(6);
    const prev7Start = dateDaysAgo(13);
    const prev7End = dateDaysAgo(7);

    const currentWeekHours = entries.reduce((sum, entry) => {
      if (entry.date && entry.date >= last7) return sum + parseHours(entry.hours);
      return sum;
    }, 0);
    const previousWeekHours = entries.reduce((sum, entry) => {
      const date = entry.date;
      if (!date) return sum;
      if (date >= prev7Start && date <= prev7End) return sum + parseHours(entry.hours);
      return sum;
    }, 0);

    const trend = Array.from({ length: 14 }, (_, idx) => {
      const daysAgo = 13 - idx;
      const date = dateDaysAgo(daysAgo);
      const labelDate = new Date(date);
      const label = `${labelDate.getMonth() + 1}/${labelDate.getDate()}`;
      const dayHours = entries.reduce((sum, entry) => {
        const entryDate = entry.date;
        return entryDate === date ? sum + parseHours(entry.hours) : sum;
      }, 0);
      return { date, label, hours: dayHours };
    });

    const activeUsers7Days = new Set(
      entries.filter((entry) => entry.date && entry.date >= last7 && entry.user_id).map((entry) => entry.user_id as string),
    ).size;

    const totalInProgress = projects.reduce((sum, p) => sum + p.inProgress, 0);
    const totals = {
      projects: projects.length,
      hours: projects.reduce((sum, p) => sum + p.hours, 0),
      tasks: projects.reduce((sum, p) => sum + p.tasks, 0),
      completed: projects.reduce((sum, p) => sum + p.completed, 0),
      activeUsers: activeUsers7Days,
      weekHours: currentWeekHours,
      previousWeekHours,
      inProgress: totalInProgress,
    };

    return <AdminAnalyticsScreen projects={projects} members={membersDetailed} totals={totals} trend={trend} />;
  }

  return <AnalyticsScreen />;
}
