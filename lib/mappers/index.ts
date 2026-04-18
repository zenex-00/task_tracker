import type { EntryRow, Task, TaskPriority, TaskRow, TaskStatus, TimeEntry } from '@/types';
import { getTodayStr } from '@/lib/utils/date';

const DEFAULT_PRIORITY: TaskPriority = 'Medium';
const DEFAULT_STATUS: TaskStatus = 'Not Started';

export function mapTaskFromDB(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    project: row.project || 'General',
    hoursSpent: parseFloat(String(row.hours_spent)) || 0,
    priority: (row.priority as TaskPriority) || DEFAULT_PRIORITY,
    status: (row.status as TaskStatus) || DEFAULT_STATUS,
    dateCompleted: row.date_completed || null,
    createdDate: row.created_date || getTodayStr(),
    completionReport: row.completion_report || null,
  };
}

export function mapTaskToDB(task: Task): TaskRow {
  return {
    id: task.id,
    name: task.name,
    project: task.project,
    hours_spent: task.hoursSpent,
    priority: task.priority,
    status: task.status,
    date_completed: task.dateCompleted || null,
    created_date: task.createdDate,
    completion_report: task.completionReport || null,
  };
}

export function mapTaskToDBWithUser(task: Task, userId: string | null): TaskRow {
  return {
    ...mapTaskToDB(task),
    user_id: userId,
  };
}

export function mapEntryFromDB(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    date: row.date,
    hours: parseFloat(String(row.hours)) || 0,
    taskId: row.task_id || null,
    billable: row.billable,
    project: row.project || 'General',
    description: row.description || '',
  };
}

export function mapEntryToDB(entry: TimeEntry): EntryRow {
  return {
    id: entry.id,
    date: entry.date,
    hours: entry.hours,
    task_id: entry.taskId || null,
    billable: entry.billable,
    project: entry.project,
    description: entry.description,
  };
}

export function mapEntryToDBWithUser(entry: TimeEntry, userId: string | null): EntryRow {
  return {
    ...mapEntryToDB(entry),
    user_id: userId,
  };
}
