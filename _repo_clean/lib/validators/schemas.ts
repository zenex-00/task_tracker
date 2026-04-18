import { z } from 'zod';

export const taskStatusSchema = z.enum(['Not Started', 'In Progress', 'Completed']);
export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High']);
export const noteIconKeySchema = z.enum(['output', 'blockers', 'plan', 'link', 'note']);

export const completionReportSchema = z.object({
  output: z.string(),
  blockers: z.string(),
  tomorrow: z.string(),
  link: z.string(),
  dynamicNotes: z.record(z.string(), z.string()),
});

export const taskSchema = z.object({
  id: z.string(),
  name: z.string(),
  project: z.string(),
  hoursSpent: z.number(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  dateCompleted: z.string().nullable(),
  createdDate: z.string(),
  completionReport: completionReportSchema.nullable(),
});

export const timeEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  hours: z.number(),
  taskId: z.string().nullable(),
  billable: z.boolean(),
  project: z.string(),
  description: z.string(),
});

export const hourTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  maxPercent: z.string(),
  color: z.string(),
});

export const noteFieldSchema = z.object({
  icon: noteIconKeySchema,
  name: z.string(),
  placeholder: z.string(),
  required: z.boolean(),
  color: z.string(),
});

export const appSettingsSchema = z.object({
  weeklyHourTarget: z.number(),
  monthlyTaskTarget: z.number(),
});