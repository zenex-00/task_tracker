'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { HourBreakdownSection } from '@/components/taskboard/HourBreakdownSection';
import { NoteFieldsSection } from '@/components/taskboard/NoteFieldsSection';
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
  const hourTypes = useAppStore((s) => s.hourTypes);
  const noteFields = useAppStore((s) => s.noteFields);
  const uploadFields = useAppStore((s) => s.uploadFields);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const upsertEntry = useAppStore((s) => s.upsertEntry);
  const [filesByField, setFilesByField] = useState<Record<string, File[]>>({});
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
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
    const set = new Set<string>(projects);
    tasks.filter((t) => t.status !== 'Completed').forEach((t) => set.add(t.project));
    return Array.from(set);
  }, [projects, tasks]);

  const handleSubmit = async (formData: FormData, form: HTMLFormElement) => {
    const selectedProject = String(formData.get('completion-task-select') || '');
    if (!selectedProject) {
      toast('Please select a project.');
      return;
    }

    let task = tasks.find((t) => t.project === selectedProject && t.status !== 'Completed');
    if (!task) {
      task = {
        id: generateId(),
        name: 'Project Work',
        project: selectedProject,
        hoursSpent: 0,
        priority: 'Medium',
        status: 'In Progress',
        dateCompleted: null,
        createdDate: getTodayStr(),
        completionReport: null,
      } as Task;
      upsertTask(task);
    }

    const date = String(formData.get('completion-date') || getTodayStr());

    const newEntries: TimeEntry[] = [];
    hourTypes.forEach((ht) => {
      const input = form.querySelector<HTMLInputElement>(`#hr-${ht.code.toLowerCase()}`);
      const hrVal = input ? parseFloat(input.value) || 0 : 0;
      if (hrVal > 0) {
        newEntries.push({
          id: generateId(),
          date,
          hours: hrVal,
          taskId: task!.id,
          billable: true,
          project: task!.project,
          description: `${ht.name}: ${task!.name}`,
        });
      }
    });

    newEntries.forEach((entry) => upsertEntry(entry));

    const totalSubmittedHours = newEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const dynamicNotes: Record<string, string> = {};
    let attachments: ReportAttachment[] = [];

    noteFields.forEach((nf, idx) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#nf-${idx}`);
      if (el) dynamicNotes[nf.name] = el.value;
    });

    if (uploadFields.length) {
      if (!currentUserId) {
        const hasAnyFile = uploadFields.some((_, idx) => {
          const fieldId = `af-${idx}`;
          return (filesByField[fieldId] || []).length > 0;
        });
        if (hasAnyFile) {
          toast('Could not upload files because the user session is not ready. Please try again.');
          return;
        }
      } else {
        try {
          for (let idx = 0; idx < uploadFields.length; idx += 1) {
            const field = uploadFields[idx];
            const fieldId = `af-${idx}`;
            const files = filesByField[fieldId] || [];
            if (field.required && !files.length) {
              toast(`Please upload at least one file for "${field.name}".`);
              return;
            }
            if (!files.length) continue;
            const uploadedFiles = await uploadAttachments(files, currentUserId, date, field.name);
            attachments = attachments.concat(uploadedFiles);
          }
        } catch (error) {
          toast(error instanceof Error ? error.message : 'File upload failed. Please try again.');
          return;
        }
      }
    }

    const nextTask: Task = {
      ...task,
      hoursSpent: (task.hoursSpent || 0) + totalSubmittedHours,
      status: 'Completed',
      dateCompleted: date,
      completionReport: {
        output: dynamicNotes["Today's Output"] || '',
        blockers: dynamicNotes.Blockers || '',
        tomorrow: dynamicNotes["Tomorrow's Plan"] || '',
        link: dynamicNotes['Output Link'] || '',
        dynamicNotes,
        attachments,
      },
    };

    upsertTask(nextTask);
    form.reset();
    const dateEl = form.querySelector<HTMLInputElement>('#completion-date');
    if (dateEl) dateEl.value = getTodayStr();
    hourTypes.forEach((ht) => {
      const input = form.querySelector<HTMLInputElement>(`#hr-${ht.code.toLowerCase()}`);
      if (input) input.value = '0';
    });
    uploadFields.forEach((_, idx) => {
      const fieldId = `af-${idx}`;
      const fileInput = fileInputRefs.current[fieldId];
      if (fileInput) fileInput.value = '';
    });
    setFilesByField({});

    toast('Task completed and report submitted.');
  };

  return (
    <form
      id="form-task-completion"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        await handleSubmit(fd, form);
      }}
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="completion-task-select">Select Project</label>
          <select id="completion-task-select" name="completion-task-select" required defaultValue="">
            <option value="" disabled>
              Choose a project
            </option>
            {selectableProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="completion-date">Date</label>
          <input id="completion-date" name="completion-date" type="date" defaultValue={getTodayStr()} required />
        </div>
      </div>

      <HourBreakdownSection hourTypes={hourTypes} onManage={onManageHourTypes} />
      <NoteFieldsSection noteFields={noteFields} onManage={onManageNoteFields} />
      <div className="attachments-section mt-4">
        <div className="section-subhead">
          <h3>Upload Documents</h3>
          <button type="button" className="btn-ghost" onClick={onManageUploadFields}>
            Edit
          </button>
        </div>
        {uploadFields.map((field: UploadField, idx: number) => (
          <div key={`${field.name}-${idx}`} className="form-group">
            <label htmlFor={`af-${idx}`}>
              {field.name} {field.required ? '*' : ''}
            </label>
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

      <button type="submit" className="btn-primary btn-large w-full mt-4">
        <span className="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V7l4-4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
          </svg>
        </span>
        Submit Completion Report
      </button>
    </form>
  );
}
