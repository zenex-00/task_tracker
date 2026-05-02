export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type NoteIconKey = 'output' | 'blockers' | 'plan' | 'link' | 'note';
export type SyncStatus = 'ok' | 'error' | 'loading';
export type ReportType = 'daily' | 'weekly' | 'monthly';
export type TeamRole =
  | 'UI/UX Designer'
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'Database Expert'
  | 'Business Developer'
  | 'Full Stack Developer'
  | 'Project Manager'
  | 'QA Engineer'
  | 'DevOps Engineer'
  | 'Other'
  | (string & {});

export interface ReportAttachment {
  fieldName?: string;
  name: string;
  path: string;
  bucket: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  publicUrl?: string;
}

export interface CompletionReport {
  output: string;
  blockers: string;
  tomorrow: string;
  link: string;
  dynamicNotes: Record<string, string>;
  attachments?: ReportAttachment[];
}

export interface Task {
  id: string;
  name: string;
  project: string;
  hoursSpent: number;
  priority: TaskPriority;
  status: TaskStatus;
  dateCompleted: string | null;
  createdDate: string;
  completionReport: CompletionReport | null;
}

export interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  taskId: string | null;
  billable: boolean;
  project: string;
  description: string;
}

export interface HourType {
  code: string;
  name: string;
  maxPercent: string;
  color: string;
}

export interface NoteField {
  icon: NoteIconKey;
  name: string;
  placeholder: string;
  required: boolean;
  color: string;
}

export interface UploadField {
  name: string;
  placeholder: string;
  required: boolean;
  accept: string;
}

export interface AppSettings {
  weeklyHourTarget: number;
  monthlyTaskTarget: number;
}

export interface AppState {
  tasks: Task[];
  timeEntries: TimeEntry[];
  projects: string[];
  assignedProjects: string[] | null;
  hourTypes: HourType[];
  noteFields: NoteField[];
  uploadFields: UploadField[];
  settings: AppSettings;
  syncStatus: SyncStatus;
  isDataLoaded: boolean;
}

export interface TaskRow {
  id: string;
  user_id?: string | null;
  name: string;
  project: string | null;
  hours_spent: number | string | null;
  priority: string | null;
  status: string | null;
  date_completed: string | null;
  created_date: string | null;
  completion_report: CompletionReport | null;
}

export interface EntryRow {
  id: string;
  user_id?: string | null;
  date: string;
  hours: number | string | null;
  task_id: string | null;
  billable: boolean;
  project: string | null;
  description: string | null;
}

export interface SettingsRow {
  id: number;
  weekly_hour_target: number;
  monthly_task_target: number;
  projects: string[] | null;
  hour_types: HourType[] | null;
  note_fields: NoteField[] | null;
  upload_fields: UploadField[] | null;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_role: TeamRole;
  is_admin: boolean;
  projects?: string[] | null;
  created_at?: string;
}
