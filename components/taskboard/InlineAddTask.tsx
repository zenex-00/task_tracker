'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store/useAppStore';
import { generateId } from '@/lib/utils/id';
import { getTodayStr } from '@/lib/utils/date';
import type { TaskPriority } from '@/types';

const schema = z.object({
  name: z.string().min(1),
  project: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type FormValues = z.infer<typeof schema>;

export function InlineAddTask() {
  const projects = useAppStore((s) => s.projects);
  const upsertTask = useAppStore((s) => s.upsertTask);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', project: projects[0] || 'General', priority: 'Medium' },
  });

  const onSubmit = (values: FormValues) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast('Please fill task name and project.');
      return;
    }

    upsertTask({
      id: generateId(),
      name: parsed.data.name,
      project: parsed.data.project,
      hoursSpent: 0,
      priority: parsed.data.priority as TaskPriority,
      status: 'In Progress',
      dateCompleted: null,
      createdDate: getTodayStr(),
      completionReport: null,
    });

    reset({ name: '', project: parsed.data.project, priority: 'Medium' });
    toast(`Task "${parsed.data.name}" added to project "${parsed.data.project}".`);
  };

  return (
    <form className="mb-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="new-task-name">Task Name</label>
          <input id="new-task-name" placeholder="Add a quick task" {...register('name')} />
        </div>
        <div className="form-group">
          <label htmlFor="new-task-project">Project</label>
          <select id="new-task-project" {...register('project')}>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="new-task-priority">Priority</label>
          <select id="new-task-priority" {...register('priority')}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>
      <button type="submit" className="btn-secondary">Add Task</button>
    </form>
  );
}