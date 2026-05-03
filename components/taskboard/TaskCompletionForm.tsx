'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { HourBreakdownSection } from '@/components/taskboard/HourBreakdownSection';
import { NoteFieldsSection } from '@/components/taskboard/NoteFieldsSection';
import { CellProgressBar } from '@/components/ui/CellProgressBar';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase/client';
import { getTodayStr } from '@/lib/utils/date';
import { generateId } from '@/lib/utils/id';
import type { ReportAttachment, Task, TimeEntry, UploadField } from '@/types';

interface TaskCompletionFormProps {
  onManageHourTypes: () => void;
  onManageNoteFields: () => void;
  onManageUploadFields: () => void;
}

interface StagedTaskDraft {
  id: string;
  name: string;
  project: string;
  date: string;
  totalHours: number;
  entries: TimeEntry[];
  dynamicNotes: Record<string, string>;
  progress: number;
  attachments: ReportAttachment[];
}

const ATTACHMENT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET || 'task-attachments';

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf('.');
  const ext = dot > -1 ? trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const base = (dot > -1 ? trimmed.slice(0, dot) : trimmed).replace(/[^a-zA-Z0-9-_]/g, '_');
  return ext ? `${base}.${ext}` : base;
}

async function uploadAttachments(files: File[], userId: string, date: string, fieldName: string): Promise<ReportAttachment[]> {
  const uploaded: ReportAttachment[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const path = `${userId}/${date}/${generateId()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      throw new Error(uploadError.message || `Failed to upload "${file.name}"`);
    }

    const { data: publicData } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
    uploaded.push({
      fieldName,
      name: file.name,
      path,
      bucket: ATTACHMENT_BUCKET,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      publicUrl: publicData.publicUrl || undefined,
    });
  }

  return uploaded;
}

function matchesAccept(file: File, accept: string): boolean {
  const rules = accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;

  const fileName = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith('.')) return fileName.endsWith(rule);
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1);
      return mime.startsWith(prefix);
    }
    return mime === rule;
  });
}

function getFileBadgeLabel(file: File): string {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'IMG';
  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  if (mime.includes('word') || ['doc', 'docx'].includes(ext)) return 'DOC';
  if (mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
  if (mime.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'PPT';
  if (mime.includes('text') || ['txt', 'md'].includes(ext)) return 'TXT';
  return 'FILE';
}

function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function TaskCompletionForm({ onManageHourTypes, onManageNoteFields, onManageUploadFields }: TaskCompletionFormProps) {
  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const assignedProjects = useAppStore((s) => s.assignedProjects);
  const hourTypes = useAppStore((s) => s.hourTypes);
  const noteFields = useAppStore((s) => s.noteFields);
  const uploadFields = useAppStore((s) => s.uploadFields);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const upsertEntry = useAppStore((s) => s.upsertEntry);

  const [filesByField, setFilesByField] = useState<Record<string, File[]>>({});
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [taskName, setTaskName] = useState('');
  const [selectedExistingTaskId, setSelectedExistingTaskId] = useState('');
  const [isProgressStep, setIsProgressStep] = useState(false);
  const [projectProgress, setProjectProgress] = useState(0);
  const [taskProgress, setTaskProgress] = useState(0);
  const [stagedTasks, setStagedTasks] = useState<StagedTaskDraft[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const appendFilesToField = (fieldId: string, incomingFiles: File[], accept: string) => {
    if (!incomingFiles.length) return;

    const accepted: File[] = [];
    let rejectedCount = 0;
    incomingFiles.forEach((file) => {
      if (matchesAccept(file, accept)) accepted.push(file);
      else rejectedCount += 1;
    });

    if (rejectedCount) {
      toast(`${rejectedCount} file(s) were skipped due to unsupported type.`);
    }
    if (!accepted.length) return;

    setFilesByField((prev) => {
      const existing = prev[fieldId] || [];
      const merged = [...existing];
      accepted.forEach((file) => {
        const exists = merged.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
        if (!exists) merged.push(file);
      });
      return { ...prev, [fieldId]: merged };
    });
  };

  const selectableProjects = useMemo(() => {
    if (assignedProjects) {
      const allowed = new Set(assignedProjects);
      const set = new Set<string>(projects.filter((project) => allowed.has(project)));
      assignedProjects.forEach((project) => set.add(project));
      return Array.from(set);
    }

    const set = new Set<string>(projects);
    tasks.forEach((t) => set.add(t.project));
    return Array.from(set);
  }, [assignedProjects, projects, tasks]);

  const existingTasksForProject = useMemo(() => {
    const filtered = tasks.filter((t) => (selectedProject ? t.project === selectedProject : true));
    const deduped = new Map<string, { id: string; name: string; progress: number; marker: string }>();
    filtered.forEach((task) => {
      const key = task.name.trim().toLowerCase();
      if (!key) return;
      const marker = task.dateCompleted || task.createdDate || '';
      const progress = task.completionReport?.taskProgress ?? 0;
      const current = deduped.get(key);
      if (!current || marker >= current.marker) {
        deduped.set(key, { id: task.id, name: task.name, progress, marker });
      }
    });
    return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, selectedProject]);

  const resetTaskInputFields = (form: HTMLFormElement) => {
    setTaskName('');
    setSelectedExistingTaskId('');
    const dateEl = form.querySelector<HTMLInputElement>('#completion-date');
    if (dateEl) dateEl.value = getTodayStr();
    hourTypes.forEach((ht) => {
      const input = form.querySelector<HTMLInputElement>(`#hr-${ht.code.toLowerCase()}`);
      if (input) input.value = '0';
    });
    noteFields.forEach((_, idx) => {
      const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#nf-${idx}`);
      if (field) field.value = '';
    });
    uploadFields.forEach((_, idx) => {
      const fieldId = `af-${idx}`;
      const fileInput = fileInputRefs.current[fieldId];
      if (fileInput) fileInput.value = '';
    });
    setFilesByField({});
    setTaskProgress(0);
    setEditingTaskId(null);
  };

  const loadDraftIntoForm = (form: HTMLFormElement, draft: StagedTaskDraft) => {
    setSelectedProject(draft.project);
    setTaskName(draft.name);
    setSelectedExistingTaskId('');
    setEditingTaskId(draft.id);
    const dateEl = form.querySelector<HTMLInputElement>('#completion-date');
    if (dateEl) dateEl.value = draft.date || getTodayStr();
    hourTypes.forEach((ht) => {
      const input = form.querySelector<HTMLInputElement>(`#hr-${ht.code.toLowerCase()}`);
      if (!input) return;
      const entry = draft.entries.find((e) => e.description.startsWith(`${ht.name}:`));
      input.value = String(entry?.hours || 0);
    });
    noteFields.forEach((nf, idx) => {
      const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#nf-${idx}`);
      if (field) field.value = draft.dynamicNotes[nf.name] || '';
    });
    setTaskProgress(draft.progress || 0);
    setFilesByField({});
  };

  const stageCurrentTask = async (formData: FormData, form: HTMLFormElement): Promise<StagedTaskDraft | null> => {
    const project = String(formData.get('completion-task-select') || selectedProject).trim();
    if (!project) {
      toast('Please select a project.');
      return null;
    }

    const rawTaskName = String(formData.get('completion-task-name') || taskName).trim();
    if (!rawTaskName) {
      toast('Please enter a task name.');
      return null;
    }

    const date = String(formData.get('completion-date') || getTodayStr());
    const taskId = editingTaskId || generateId();

    const entries: TimeEntry[] = [];
    hourTypes.forEach((ht) => {
      const input = form.querySelector<HTMLInputElement>(`#hr-${ht.code.toLowerCase()}`);
      const hrVal = input ? parseFloat(input.value) || 0 : 0;
      if (hrVal > 0) {
        entries.push({
          id: generateId(),
          date,
          hours: hrVal,
          taskId,
          billable: true,
          project,
          description: `${ht.name}: ${rawTaskName}`,
        });
      }
    });

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const dynamicNotes: Record<string, string> = {};
    noteFields.forEach((nf, idx) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#nf-${idx}`);
      if (el) dynamicNotes[nf.name] = el.value;
    });

    let attachments: ReportAttachment[] = [];
    if (uploadFields.length) {
      if (!currentUserId) {
        const hasAnyFile = uploadFields.some((_, idx) => {
          const fieldId = `af-${idx}`;
          return (filesByField[fieldId] || []).length > 0;
        });
        if (hasAnyFile) {
          toast('Could not upload files because the user session is not ready. Please try again.');
          return null;
        }
      } else {
        try {
          for (let idx = 0; idx < uploadFields.length; idx += 1) {
            const field = uploadFields[idx];
            const fieldId = `af-${idx}`;
            const files = filesByField[fieldId] || [];
            if (!files.length) continue;
            const uploadedFiles = await uploadAttachments(files, currentUserId, date, field.name);
            attachments = attachments.concat(uploadedFiles);
          }
        } catch (error) {
          toast(error instanceof Error ? error.message : 'File upload failed. Please try again.');
          return null;
        }
      }
    }

    return {
      id: taskId,
      name: rawTaskName,
      project,
      date,
      totalHours,
      entries,
      dynamicNotes,
      progress: taskProgress,
      attachments,
    };
  };

  const handleNextTask = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;

    const draft = await stageCurrentTask(new FormData(form), form);
    if (!draft) return;

    setStagedTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === draft.id);
      if (idx === -1) return [...prev, draft];
      const next = [...prev];
      next[idx] = draft;
      return next;
    });
    setSelectedProject(draft.project);
    resetTaskInputFields(form);
    toast(editingTaskId ? 'Task updated. You can add another task.' : 'Task saved temporarily. You can add another task.');
  };

  const handleFinish = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;

    const draft = await stageCurrentTask(new FormData(form), form);
    if (!draft) return;

    setStagedTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === draft.id);
      if (idx === -1) return [...prev, draft];
      const next = [...prev];
      next[idx] = draft;
      return next;
    });
    setSelectedProject(draft.project);
    setEditingTaskId(null);
    setIsProgressStep(true);
  };

  const handleBackTask = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form || !stagedTasks.length) return;
    const currentIdx = editingTaskId ? stagedTasks.findIndex((t) => t.id === editingTaskId) : stagedTasks.length;
    const previousIdx = Math.max(0, currentIdx - 1);
    const previous = stagedTasks[previousIdx];
    loadDraftIntoForm(form, previous);
    toast(`Editing previous task: "${previous.name}"`);
  };

  const handleSubmitFullReport = async () => {
    if (!selectedProject) {
      toast('Please select a project first.');
      setIsProgressStep(false);
      return;
    }

    const projectTasks = stagedTasks.filter((task) => task.project === selectedProject);
    if (!projectTasks.length) {
      toast('Please add at least one task before submitting.');
      setIsProgressStep(false);
      return;
    }

    for (const draft of projectTasks) {
      const normalizedProgress = Math.max(0, Math.min(100, draft.progress || 0));
      const status: Task['status'] = normalizedProgress >= 100 ? 'Completed' : 'In Progress';
      const finalTask: Task = {
        id: draft.id,
        name: draft.name,
        project: draft.project,
        hoursSpent: draft.totalHours,
        priority: 'Medium',
        status,
        dateCompleted: status === 'Completed' ? draft.date : null,
        createdDate: getTodayStr(),
        completionReport: {
          output: draft.dynamicNotes["Today's Output"] || '',
          blockers: draft.dynamicNotes.Blockers || '',
          tomorrow: draft.dynamicNotes["Tomorrow's Plan"] || '',
          link: draft.dynamicNotes['Output Link'] || '',
          dynamicNotes: { ...draft.dynamicNotes },
          taskProgress: normalizedProgress,
          projectProgress,
          attachments: draft.attachments,
        },
      };

      const taskOk = await upsertTask(finalTask);
      if (!taskOk) {
        toast(`Failed to save task "${draft.name}". Submission stopped.`);
        return;
      }

      for (const entry of draft.entries) {
        const entryOk = await upsertEntry(entry);
        if (!entryOk) {
          toast(`Failed to save time entry for "${draft.name}". Submission stopped.`);
          return;
        }
      }
    }

    setStagedTasks([]);
    setTaskName('');
    setProjectProgress(0);
    setIsProgressStep(false);

    toast('Final report submitted with all staged tasks and project progress.');
  };

  if (isProgressStep) {
    const projectTasks = stagedTasks.filter((task) => task.project === selectedProject);
    const totalInvestedHours = projectTasks.reduce((sum, t) => sum + t.totalHours, 0);
    const progressTone = projectProgress < 34 ? 'Started' : projectProgress < 80 ? 'In Progress' : 'Near Completion';
    const formatHours = (value: number) => {
      const totalMinutes = Math.max(0, Math.round(value * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    };
    return (
      <div className="progress-milestone-card">
        <div className="progress-top-row">
          <div>
            <p className="progress-kicker">Current Milestone</p>
            <h3 className="progress-title">{selectedProject} Progress</h3>
            <p className="progress-subtle-state">{progressTone}</p>
          </div>
          <span className="progress-pill">Cell Tracking</span>
        </div>
        <div className="progress-slider-block progress-cell-block">
          <div className="progress-label-row">
            <label className="progress-label">
              Overall Progress
            </label>
          </div>
          <CellProgressBar ariaLabel="Project progress" value={projectProgress} onChange={setProjectProgress} />
        </div>
        <div className="progress-stages">
          <span>Started</span>
          <span>In Progress</span>
          <span>Completed</span>
        </div>
        <div className="progress-metrics">
          <div>
            <span className="metric-label">Time Invested</span>
            <strong>{formatHours(totalInvestedHours)}</strong>
          </div>
        </div>
        <p className="section-subtitle" style={{ marginTop: '0.75rem' }}>
          Tasks in this report: <strong>{projectTasks.length}</strong>
        </p>
        <div className="task-form-actions mt-4">
          <button type="button" className="btn-add-task btn-large w-full" onClick={() => setIsProgressStep(false)}>
            Back to Tasks
          </button>
          <button type="button" className="btn-submit-report btn-large w-full" onClick={handleSubmitFullReport}>
            Finish & Submit Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="form-task-completion"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="completion-task-select">Select Project</label>
          <select
            id="completion-task-select"
            name="completion-task-select"
            required
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="" disabled>
              Choose a project
            </option>
            {selectableProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          {assignedProjects && selectableProjects.length === 0 ? (
            <small className="attachments-help">No project has been assigned to your account yet. Contact an admin.</small>
          ) : null}
        </div>
        <div className="form-group">
          <label htmlFor="completion-task-name">Create New Task</label>
          <select
            id="completion-existing-task"
            name="completion-existing-task"
            value={selectedExistingTaskId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedExistingTaskId(id);
              if (!id) return;
              const selected = existingTasksForProject.find((item) => item.id === id);
              if (!selected) return;
              setTaskName(selected.name);
              setTaskProgress(selected.progress);
            }}
            style={{ marginBottom: '8px' }}
          >
            <option value="">Select existing task (optional)</option>
            {existingTasksForProject.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
          <input
            id="completion-task-name"
            name="completion-task-name"
            type="text"
            value={taskName}
            onChange={(e) => {
              setTaskName(e.target.value);
              if (selectedExistingTaskId) setSelectedExistingTaskId('');
            }}
            placeholder="Enter task name"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="completion-date">Date</label>
          <input id="completion-date" name="completion-date" type="date" defaultValue={getTodayStr()} required />
        </div>
      </div>

      <HourBreakdownSection hourTypes={hourTypes} onManage={onManageHourTypes} />
      <NoteFieldsSection noteFields={noteFields} onManage={onManageNoteFields} />
      <div className="progress-slider-block progress-cell-block mt-4">
        <div className="progress-label-row">
          <label className="progress-label">Task Progress</label>
          <span className="progress-value-chip">{taskProgress}%</span>
        </div>
        <CellProgressBar ariaLabel="Task progress" value={taskProgress} onChange={setTaskProgress} />
      </div>
      <div className="attachments-section mt-4">
        <div className="section-subhead">
          <h3>Upload Documents</h3>
          <button type="button" className="btn-ghost" onClick={onManageUploadFields}>
            Edit
          </button>
        </div>
        {uploadFields.map((field: UploadField, idx: number) => (
          <div key={`${field.name}-${idx}`} className="form-group">
            <label htmlFor={`af-${idx}`}>{field.name} (Optional)</label>
            <div
              className={`file-dropzone file-dropzone-clickable ${dragOverFieldId === `af-${idx}` ? 'is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverFieldId(`af-${idx}`);
              }}
              onDragLeave={() => {
                setDragOverFieldId((prev) => (prev === `af-${idx}` ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fieldId = `af-${idx}`;
                setDragOverFieldId(null);
                appendFilesToField(fieldId, Array.from(e.dataTransfer.files || []), field.accept);
              }}
              onClick={() => fileInputRefs.current[`af-${idx}`]?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRefs.current[`af-${idx}`]?.click();
                }
              }}
            >
              <input
                id={`af-${idx}`}
                className="file-picker-native"
                type="file"
                multiple
                accept={field.accept}
                ref={(node) => {
                  fileInputRefs.current[`af-${idx}`] = node;
                }}
                onChange={(e) => {
                  const fieldId = `af-${idx}`;
                  const nextFiles = Array.from(e.target.files || []);
                  appendFilesToField(fieldId, nextFiles, field.accept);
                  e.currentTarget.value = '';
                }}
              />
              <span className="dropzone-title">Drag your files or click to browse</span>
              <span className="dropzone-subtitle">
                {(filesByField[`af-${idx}`] || []).length ? `${(filesByField[`af-${idx}`] || []).length} file(s) selected` : 'No files selected'}
              </span>
            </div>
            {(filesByField[`af-${idx}`] || []).length ? (
              <div className="selected-files-list">
                {(filesByField[`af-${idx}`] || []).map((file) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="selected-file-chip">
                    <span className="file-kind-badge">{getFileBadgeLabel(file)}</span>
                    <span className="selected-file-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="selected-file-size">{humanFileSize(file.size)}</span>
                    <button
                      type="button"
                      className="selected-file-remove"
                      onClick={() => {
                        const fieldId = `af-${idx}`;
                        setFilesByField((prev) => ({
                          ...prev,
                          [fieldId]: (prev[fieldId] || []).filter(
                            (f) => !(f.name === file.name && f.size === file.size && f.lastModified === file.lastModified),
                          ),
                        }));
                      }}
                      aria-label={`Remove ${file.name}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <small className="attachments-help">{field.placeholder}</small>
          </div>
        ))}
      </div>

      <div className="task-actions-row mt-4">
        <button
          type="button"
          className="btn-ghost task-back-btn"
          onClick={handleBackTask}
          disabled={stagedTasks.length === 0}
          aria-disabled={stagedTasks.length === 0}
        >
          Back
        </button>
        <div className="task-form-actions">
          <button type="button" className="btn-add-task btn-large" onClick={handleNextTask}>
            <span className="plus-circle" aria-hidden="true">
              +
            </span>
            Add Another Task
          </button>
          <button type="button" className="btn-submit-report btn-large" onClick={handleFinish}>
            Finish & Submit Report
          </button>
        </div>
      </div>
    </form>
  );
}
