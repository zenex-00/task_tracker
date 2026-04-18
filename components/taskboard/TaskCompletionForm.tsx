'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';

import { HourBreakdownSection } from '@/components/taskboard/HourBreakdownSection';
import { NoteFieldsSection } from '@/components/taskboard/NoteFieldsSection';
import { useAppStore } from '@/lib/store/useAppStore';
import { getTodayStr } from '@/lib/utils/date';
import { generateId } from '@/lib/utils/id';
import type { Task, TimeEntry } from '@/types';

interface TaskCompletionFormProps {
  onManageHourTypes: () => void;
  onManageNoteFields: () => void;
}

export function TaskCompletionForm({ onManageHourTypes, onManageNoteFields }: TaskCompletionFormProps) {
  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const hourTypes = useAppStore((s) => s.hourTypes);
  const noteFields = useAppStore((s) => s.noteFields);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const upsertEntry = useAppStore((s) => s.upsertEntry);

  const selectableProjects = useMemo(() => {
    const set = new Set<string>(projects);
    tasks.filter((t) => t.status !== 'Completed').forEach((t) => set.add(t.project));
    return Array.from(set);
  }, [projects, tasks]);

  const handleSubmit = (formData: FormData, form: HTMLFormElement) => {
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

    noteFields.forEach((nf, idx) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#nf-${idx}`);
      if (el) dynamicNotes[nf.name] = el.value;
    });

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

    toast('Task completed and report submitted.');
  };

  return (
    <form
      id="form-task-completion"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        handleSubmit(fd, form);
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