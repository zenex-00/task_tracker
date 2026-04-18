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
  loadAllData: () => Promise<boolean>;
  setSyncStatus: (status: SyncStatus) => void;
  setDataLoaded: (loaded: boolean) => void;
  setLocalFallback: (payload: { projects: string[]; hourTypes: HourType[]; noteFields: NoteField[]; uploadFields: UploadField[] }) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  upsertEntry: (entry: TimeEntry) => void;
  addProject: (name: string) => void;
  removeProject: (idx: number) => void;
  updateProjects: (projects: string[]) => void;
  addHourType: (ht: HourType) => void;
  removeHourType: (idx: number) => void;
  updateHourTypes: (types: HourType[]) => void;
  addNoteField: (nf: NoteField) => void;
  removeNoteField: (idx: number) => void;
  updateNoteFields: (fields: NoteField[]) => void;
  addUploadField: (field: UploadField) => void;
  removeUploadField: (idx: number) => void;
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

  s.setSyncStatus('loading');
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    weekly_hour_target: s.settings.weeklyHourTarget,
    monthly_task_target: s.settings.monthlyTaskTarget,
    projects: s.projects,
    hour_types: s.hourTypes,
    note_fields: s.noteFields,
  });

  if (error) {
    console.error('Settings upsert error:', error);
    s.setSyncStatus('error');
    return;
  }

  s.setSyncStatus('ok');
}

export const useAppStore = create<AppStore>((set, get) => ({
  tasks: [],
  timeEntries: [],
  currentUserId: null,
  projects: DEFAULT_PROJECTS,
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

      const [tasksRes, entriesRes, settingsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', currentUserId).order('created_date', { ascending: false }),
        supabase.from('time_entries').select('*').eq('user_id', currentUserId).order('date', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 1).single(),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const tasks = ((tasksRes.data || []) as unknown as import('@/types').TaskRow[]).map(mapTaskFromDB);
      const timeEntries = ((entriesRes.data || []) as unknown as EntryRow[]).map(mapEntryFromDB);

      const settings = settingsRes.data as SettingsRow | null;
      const nextSettings: AppSettings = {
        weeklyHourTarget: settings?.weekly_hour_target ?? DEFAULT_SETTINGS.weeklyHourTarget,
        monthlyTaskTarget: settings?.monthly_task_target ?? DEFAULT_SETTINGS.monthlyTaskTarget,
      };

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
        settings: nextSettings,
        projects,
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

  upsertTask: (task) => {
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx === -1) return { tasks: [task, ...state.tasks] };
      const tasks = [...state.tasks];
      tasks[idx] = task;
      return { tasks };
    });

    void (async () => {
      get().setSyncStatus('loading');
      const payload = mapTaskToDBWithUser(task, get().currentUserId);
      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) {
        console.error('Task upsert error:', error);
        get().setSyncStatus('error');
        return;
      }
      get().setSyncStatus('ok');
    })();
  },

  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      timeEntries: state.timeEntries.filter((entry) => entry.taskId !== taskId),
    }));

    void (async () => {
      get().setSyncStatus('loading');
      const currentUserId = get().currentUserId;
      let taskDeleteQuery = supabase.from('tasks').delete().eq('id', taskId);
      let entryDeleteQuery = supabase.from('time_entries').delete().eq('task_id', taskId);
      if (currentUserId) {
        taskDeleteQuery = taskDeleteQuery.eq('user_id', currentUserId);
        entryDeleteQuery = entryDeleteQuery.eq('user_id', currentUserId);
      }

      const { error: taskErr } = await taskDeleteQuery;
      const { error: entryErr } = await entryDeleteQuery;
      if (taskErr || entryErr) {
        console.error('Task delete error:', taskErr || entryErr);
        get().setSyncStatus('error');
        return;
      }
      get().setSyncStatus('ok');
    })();
  },

  upsertEntry: (entry) => {
    set((state) => {
      const idx = state.timeEntries.findIndex((e) => e.id === entry.id);
      if (idx === -1) return { timeEntries: [entry, ...state.timeEntries] };
      const timeEntries = [...state.timeEntries];
      timeEntries[idx] = entry;
      return { timeEntries };
    });

    void (async () => {
      get().setSyncStatus('loading');
      const payload = mapEntryToDBWithUser(entry, get().currentUserId);
      const { error } = await supabase.from('time_entries').upsert(payload);
      if (error) {
        console.error('Entry upsert error:', error);
        get().setSyncStatus('error');
        return;
      }
      get().setSyncStatus('ok');
    })();
  },

  addProject: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => {
      if (state.projects.includes(trimmed)) return {};
      const projects = [...state.projects, trimmed];
      writeLocalArray(PROJECTS_KEY, projects);
      return { projects };
    });
    void syncSettings(get);
  },

  removeProject: (idx) => {
    set((state) => {
      const projects = state.projects.filter((_, i) => i !== idx);
      writeLocalArray(PROJECTS_KEY, projects);
      return { projects };
    });
    void syncSettings(get);
  },

  updateProjects: (projects) => {
    const clean = projects.map((p) => p.trim()).filter(Boolean);
    set({ projects: clean });
    writeLocalArray(PROJECTS_KEY, clean);
    void syncSettings(get);
  },

  addHourType: (ht) => {
    set((state) => {
      const hourTypes = [...state.hourTypes, ht];
      writeLocalArray(HOUR_TYPES_KEY, hourTypes);
      return { hourTypes };
    });
    void syncSettings(get);
  },

  removeHourType: (idx) => {
    set((state) => {
      const hourTypes = state.hourTypes.filter((_, i) => i !== idx);
      writeLocalArray(HOUR_TYPES_KEY, hourTypes);
      return { hourTypes };
    });
    void syncSettings(get);
  },

  updateHourTypes: (types) => {
    set({ hourTypes: types });
    writeLocalArray(HOUR_TYPES_KEY, types);
    void syncSettings(get);
  },

  addNoteField: (nf) => {
    set((state) => {
      const noteFields = normalizeNoteFields([...state.noteFields, nf]);
      writeLocalArray(NOTE_FIELDS_KEY, noteFields);
      return { noteFields };
    });
    void syncSettings(get);
  },

  removeNoteField: (idx) => {
    set((state) => {
      const noteFields = state.noteFields.filter((_, i) => i !== idx);
      writeLocalArray(NOTE_FIELDS_KEY, noteFields);
      return { noteFields };
    });
    void syncSettings(get);
  },

  updateNoteFields: (fields) => {
    const noteFields = normalizeNoteFields(fields);
    set({ noteFields });
    writeLocalArray(NOTE_FIELDS_KEY, noteFields);
    void syncSettings(get);
  },

  addUploadField: (field) => {
    set((state) => {
      const uploadFields = [...state.uploadFields, field];
      writeLocalArray(UPLOAD_FIELDS_KEY, uploadFields);
      return { uploadFields };
    });
    void syncSettings(get);
  },

  removeUploadField: (idx) => {
    set((state) => {
      const uploadFields = state.uploadFields.filter((_, i) => i !== idx);
      writeLocalArray(UPLOAD_FIELDS_KEY, uploadFields);
      return { uploadFields };
    });
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
}));

export function getLocalFallbackData() {
  return {
    projects: readLocalArray<string>(PROJECTS_KEY, DEFAULT_PROJECTS),
    hourTypes: readLocalArray<HourType>(HOUR_TYPES_KEY, DEFAULT_HOUR_TYPES),
    noteFields: normalizeNoteFields(readLocalArray<NoteField>(NOTE_FIELDS_KEY, DEFAULT_NOTE_FIELDS)),
    uploadFields: readLocalArray<UploadField>(UPLOAD_FIELDS_KEY, DEFAULT_UPLOAD_FIELDS),
  };
}
