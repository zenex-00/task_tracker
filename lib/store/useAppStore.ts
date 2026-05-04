import { create } from 'zustand';

import { mapEntryFromDB, mapEntryToDBWithUser, mapTaskFromDB, mapTaskToDBWithUser } from '@/lib/mappers';
import { supabase } from '@/lib/supabase/client';
import { normalizeNoteFields } from '@/lib/utils/noteIcons';
import type {
  AppSettings,
  AppState,
  EntryRow,
  HourType,
  NoteField,
  SettingsRow,
  SyncStatus,
  Task,
  TimeEntry,
  UploadField,
} from '@/types';

const PROJECTS_KEY = 'ft_projects';
const HOUR_TYPES_KEY = 'ft_hour_types';
const NOTE_FIELDS_KEY = 'ft_note_fields';
const UPLOAD_FIELDS_KEY = 'ft_upload_fields';

const DEFAULT_PROJECTS = ['YPMP', 'Hudhud', 'Sakeena', 'CON-BID', 'Other', 'Mewo'];
const DEFAULT_HOUR_TYPES: HourType[] = [
  { code: 'DEV', name: 'Development', maxPercent: '', color: '#4f46e5' },
  { code: 'RES', name: 'Research', maxPercent: '20', color: '#c2410c' },
  { code: 'MTG', name: 'Meetings', maxPercent: '15', color: '#166534' },
];
const DEFAULT_NOTE_FIELDS: NoteField[] = [
  { icon: 'output', name: "Today's Output", placeholder: 'What did you accomplish?', required: true, color: 'var(--success)' },
  { icon: 'blockers', name: 'Blockers', placeholder: 'Any blockers? How were they resolved?', required: false, color: 'var(--warning)' },
  { icon: 'plan', name: "Tomorrow's Plan", placeholder: "What's planned for tomorrow?", required: false, color: 'var(--danger)' },
  { icon: 'link', name: 'Output Link', placeholder: 'GitHub commit / deployed URL', required: false, color: 'var(--text-muted)' },
];
const DEFAULT_UPLOAD_FIELDS: UploadField[] = [
  {
    name: 'Requirement / Technical Documents',
    placeholder: 'Attach requirement docs, technical docs, screenshots, or reference images.',
    required: false,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  weeklyHourTarget: 40,
  monthlyTaskTarget: 100,
};

type AppStore = AppState & {
  currentUserId: string | null;
  canManageSettings: boolean;
  loadAllData: () => Promise<boolean>;
  setSyncStatus: (status: SyncStatus) => void;
  setDataLoaded: (loaded: boolean) => void;
  setLocalFallback: (payload: { projects: string[]; hourTypes: HourType[]; noteFields: NoteField[]; uploadFields: UploadField[] }) => void;
  upsertTask: (task: Task) => Promise<boolean>;
  deleteTask: (taskId: string) => void;
  upsertEntry: (entry: TimeEntry) => Promise<boolean>;
  deleteEntry: (entryId: string) => void;
  updateProjects: (projects: string[]) => void;
  updateHourTypes: (types: HourType[]) => void;
  updateNoteFields: (fields: NoteField[]) => void;
  updateUploadFields: (fields: UploadField[]) => void;
  advanceTaskStatus: (taskId: string) => void;
  updateSettings: (settings: AppSettings) => void;
};

function readLocalArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

function writeLocalArray<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function syncSettings(get: () => AppStore): Promise<void> {
  const s = get();
  if (!s.isDataLoaded) return;
  if (!s.canManageSettings) return;

  s.setSyncStatus('loading');
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    weekly_hour_target: s.settings.weeklyHourTarget,
    monthly_task_target: s.settings.monthlyTaskTarget,
    projects: s.projects,
    hour_types: s.hourTypes,
    note_fields: s.noteFields,
    upload_fields: s.uploadFields,
  });

  if (error) {
    console.error('Settings upsert error:', error);
    s.setSyncStatus('error');
    return;
  }

  s.setSyncStatus('ok');
}

export const useAppStore = create<AppStore>((set, get) => {
  const ensureCurrentUserId = async (): Promise<string | null> => {
    const existing = get().currentUserId;
    if (existing) return existing;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error('Missing authenticated user for database mutation:', authError || new Error('Missing authenticated user'));
      return null;
    }

    const userId = authData.user.id;
    set({ currentUserId: userId });
    return userId;
  };

  return {
  tasks: [],
  timeEntries: [],
  currentUserId: null,
  canManageSettings: false,
  projects: DEFAULT_PROJECTS,
  assignedProjects: null,
  hourTypes: DEFAULT_HOUR_TYPES,
  noteFields: DEFAULT_NOTE_FIELDS,
  uploadFields: DEFAULT_UPLOAD_FIELDS,
  settings: DEFAULT_SETTINGS,
  syncStatus: 'loading',
  isDataLoaded: false,

  setSyncStatus: (status) => set({ syncStatus: status }),
  setDataLoaded: (loaded) => set({ isDataLoaded: loaded }),
  setLocalFallback: ({ projects, hourTypes, noteFields, uploadFields }) =>
    set({
      projects: projects.length ? projects : DEFAULT_PROJECTS,
      hourTypes: hourTypes.length ? hourTypes : DEFAULT_HOUR_TYPES,
      noteFields: noteFields.length ? normalizeNoteFields(noteFields) : DEFAULT_NOTE_FIELDS,
      uploadFields: uploadFields.length ? uploadFields : DEFAULT_UPLOAD_FIELDS,
    }),

  loadAllData: async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError || new Error('Missing authenticated user');
      }

      const currentUserId = authData.user.id;

      const [tasksRes, entriesRes, settingsRes, profileRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, user_id, name, project, hours_spent, priority, status, date_completed, created_date, completion_report')
          .eq('user_id', currentUserId)
          .order('created_date', { ascending: false }),
        supabase.from('time_entries').select('id, user_id, date, hours, task_id, billable, project, description').eq('user_id', currentUserId).order('date', { ascending: false }),
        supabase.from('settings').select('id, weekly_hour_target, monthly_task_target, projects, hour_types, note_fields, upload_fields').eq('id', 1).single(),
        supabase.from('user_profiles').select('is_admin, projects').eq('id', currentUserId).maybeSingle<{ is_admin: boolean; projects: string[] | null }>(),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (settingsRes.error) {
        throw settingsRes.error;
      }

      const tasks = ((tasksRes.data || []) as unknown as import('@/types').TaskRow[]).map(mapTaskFromDB);
      const timeEntries = ((entriesRes.data || []) as unknown as EntryRow[]).map(mapEntryFromDB);

      const settings = settingsRes.data as SettingsRow | null;
      const nextSettings: AppSettings = {
        weeklyHourTarget: settings?.weekly_hour_target ?? DEFAULT_SETTINGS.weeklyHourTarget,
        monthlyTaskTarget: settings?.monthly_task_target ?? DEFAULT_SETTINGS.monthlyTaskTarget,
      };
      const canManageSettings = !profileRes.error && Boolean(profileRes.data?.is_admin);
      const assignedProjects = canManageSettings ? null : (profileRes.data?.projects ?? null);

      const projects = settings?.projects?.length ? settings.projects : get().projects;
      const hourTypes = settings?.hour_types?.length ? settings.hour_types : get().hourTypes;
      const noteFields = settings?.note_fields?.length ? normalizeNoteFields(settings.note_fields) : get().noteFields;
      const uploadFields = settings?.upload_fields?.length ? settings.upload_fields : get().uploadFields;

      writeLocalArray(PROJECTS_KEY, projects);
      writeLocalArray(HOUR_TYPES_KEY, hourTypes);
      writeLocalArray(NOTE_FIELDS_KEY, noteFields);
      writeLocalArray(UPLOAD_FIELDS_KEY, uploadFields);

      set({
        tasks,
        timeEntries,
        currentUserId,
        canManageSettings,
        settings: nextSettings,
        projects,
        assignedProjects,
        hourTypes,
        noteFields,
        uploadFields,
        syncStatus: 'ok',
        isDataLoaded: true,
      });

      return true;
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  upsertTask: async (task) => {
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx === -1) return { tasks: [task, ...state.tasks] };
      const tasks = [...state.tasks];
      tasks[idx] = task;
      return { tasks };
    });

    get().setSyncStatus('loading');
    const userId = await ensureCurrentUserId();
    if (!userId) {
      get().setSyncStatus('error');
      return false;
    }

    const payload = mapTaskToDBWithUser(task, userId);
    const { error } = await supabase.from('tasks').upsert(payload);
    if (error) {
      console.error('Task upsert error:', error);
      get().setSyncStatus('error');
      return false;
    }
    get().setSyncStatus('ok');
    return true;
  },

  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      timeEntries: state.timeEntries.filter((entry) => entry.taskId !== taskId),
    }));

    void (async () => {
      get().setSyncStatus('loading');
      const userId = await ensureCurrentUserId();
      if (!userId) {
        get().setSyncStatus('error');
        return;
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
      if (error) {
        console.error('Task delete error:', error);
        get().setSyncStatus('error');
        return;
      }
      get().setSyncStatus('ok');
    })();
  },

  upsertEntry: async (entry) => {
    set((state) => {
      const idx = state.timeEntries.findIndex((e) => e.id === entry.id);
      if (idx === -1) return { timeEntries: [entry, ...state.timeEntries] };
      const timeEntries = [...state.timeEntries];
      timeEntries[idx] = entry;
      return { timeEntries };
    });

    get().setSyncStatus('loading');
    const userId = await ensureCurrentUserId();
    if (!userId) {
      get().setSyncStatus('error');
      return false;
    }

    const payload = mapEntryToDBWithUser(entry, userId);
    const { error } = await supabase.from('time_entries').upsert(payload);
    if (error) {
      console.error('Entry upsert error:', error);
      get().setSyncStatus('error');
      return false;
    }
    get().setSyncStatus('ok');
    return true;
  },

  deleteEntry: (entryId) => {
    set((state) => ({
      timeEntries: state.timeEntries.filter((entry) => entry.id !== entryId),
    }));

    void (async () => {
      get().setSyncStatus('loading');
      const userId = await ensureCurrentUserId();
      if (!userId) {
        get().setSyncStatus('error');
        return;
      }

      const { error } = await supabase.from('time_entries').delete().eq('id', entryId).eq('user_id', userId);
      if (error) {
        console.error('Entry delete error:', error);
        get().setSyncStatus('error');
        return;
      }

      get().setSyncStatus('ok');
    })();
  },

  updateProjects: (projects) => {
    const clean = projects.map((p) => p.trim()).filter(Boolean);
    set({ projects: clean });
    writeLocalArray(PROJECTS_KEY, clean);
    void syncSettings(get);
  },

  updateHourTypes: (types) => {
    set({ hourTypes: types });
    writeLocalArray(HOUR_TYPES_KEY, types);
    void syncSettings(get);
  },

  updateNoteFields: (fields) => {
    const noteFields = normalizeNoteFields(fields);
    set({ noteFields });
    writeLocalArray(NOTE_FIELDS_KEY, noteFields);
    void syncSettings(get);
  },

  updateUploadFields: (fields) => {
    const uploadFields = fields.map((field) => ({
      ...field,
      name: field.name.trim(),
      placeholder: field.placeholder || '',
      accept: field.accept || DEFAULT_UPLOAD_FIELDS[0].accept,
    }));
    set({ uploadFields });
    writeLocalArray(UPLOAD_FIELDS_KEY, uploadFields);
    void syncSettings(get);
  },

  advanceTaskStatus: (taskId) => {
    const statuses: Array<Task['status']> = ['Not Started', 'In Progress', 'Completed'];
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextIdx = (statuses.indexOf(task.status) + 1) % statuses.length;
    const nextTask: Task = {
      ...task,
      status: statuses[nextIdx],
      dateCompleted: statuses[nextIdx] === 'Completed' && !task.dateCompleted ? new Date().toISOString().split('T')[0] : task.dateCompleted,
    };
    get().upsertTask(nextTask);
  },

  updateSettings: (settings) => {
    set({ settings });
    void syncSettings(get);
  },
};
});

export function getLocalFallbackData() {
  return {
    projects: readLocalArray<string>(PROJECTS_KEY, DEFAULT_PROJECTS),
    hourTypes: readLocalArray<HourType>(HOUR_TYPES_KEY, DEFAULT_HOUR_TYPES),
    noteFields: normalizeNoteFields(readLocalArray<NoteField>(NOTE_FIELDS_KEY, DEFAULT_NOTE_FIELDS)),
    uploadFields: readLocalArray<UploadField>(UPLOAD_FIELDS_KEY, DEFAULT_UPLOAD_FIELDS),
  };
}
