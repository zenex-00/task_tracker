# AI IDE Prompt: Migrate Freelance Tracker to Next.js + TypeScript + Supabase

---

## 🎯 ROLE & OBJECTIVE

You are a senior full-stack engineer. Your task is to migrate an existing vanilla HTML/CSS/JS freelance task-tracking application into a modern, scalable production app using **Next.js 14 (App Router)**, **TypeScript**, and **Supabase**. Preserve every feature, every business rule, and the full UI/UX language of the original — but rebuild it properly with type safety, server-side rendering, clean component architecture, and scalability in mind.

**Do not simplify any feature. Do not skip any logic. The goal is a faithful, production-grade migration — not a rework.**

---

## 📦 TECH STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password — prepare the foundation even if not yet active) |
| State Management | Zustand |
| Styling | Tailwind CSS + CSS Modules for custom design tokens |
| Charts | Recharts |
| PDF Generation | jsPDF + jspdf-autotable (same libraries as original) |
| Form Handling | React Hook Form + Zod |
| Notifications | Sonner (toast) |
| Icons | Inline SVG components (preserve originals exactly) |

---

## 🗂 PROJECT STRUCTURE

Generate this folder structure in full:

```
/
├── app/
│   ├── layout.tsx                  # Root layout with font + providers
│   ├── page.tsx                    # Redirects or renders TaskBoard
│   ├── globals.css                 # CSS variables + base styles (migrated from styles.css)
│   └── (dashboard)/
│       ├── layout.tsx              # Dashboard shell: TopBar + BottomTabs
│       ├── taskboard/page.tsx
│       ├── reports/page.tsx
│       └── analytics/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   └── BottomTabs.tsx
│   ├── taskboard/
│   │   ├── TaskCompletionForm.tsx
│   │   ├── HourBreakdownSection.tsx
│   │   ├── NoteFieldsSection.tsx
│   │   └── InlineAddTask.tsx
│   ├── reports/
│   │   ├── PdfReportButtons.tsx
│   │   ├── TasksTable.tsx
│   │   └── ProjectsDonutChart.tsx
│   ├── analytics/
│   │   ├── KpiGrid.tsx
│   │   ├── ProductivityBarChart.tsx
│   │   └── ProjectBreakdownList.tsx
│   ├── modals/
│   │   ├── ManageProjectsModal.tsx
│   │   ├── ManageHourTypesModal.tsx
│   │   └── ManageNoteFieldsModal.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── SyncDot.tsx
│       ├── Modal.tsx
│       ├── NoteIcon.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # createBrowserClient
│   │   ├── server.ts               # createServerClient (for Server Components)
│   │   └── middleware.ts           # Session refresh middleware
│   ├── store/
│   │   └── useAppStore.ts          # Zustand global store
│   ├── utils/
│   │   ├── date.ts                 # getTodayStr, date helpers
│   │   ├── id.ts                   # generateId()
│   │   ├── noteIcons.ts            # NOTE_ICON_MAP + normalizers
│   │   └── color.ts                # hexToRgba()
│   ├── pdf/
│   │   └── generateReport.ts       # Full PDF logic (daily/weekly/monthly)
│   ├── mappers/
│   │   └── index.ts                # mapTaskFromDB, mapTaskToDB, mapEntryFromDB, mapEntryToDB
│   └── validators/
│       └── schemas.ts              # Zod schemas for all entities
│
├── hooks/
│   ├── useSupabaseSync.ts          # Wraps upsert/delete with sync status
│   ├── useLoadData.ts              # Initial data fetch from Supabase
│   └── useCharts.ts                # Chart data computation helpers
│
├── types/
│   └── index.ts                    # All shared TypeScript interfaces
│
└── middleware.ts                   # Next.js middleware for Supabase session
```

---

## 🗃 TYPE DEFINITIONS (`types/index.ts`)

Define every type strictly. Do not use `any`.

```typescript
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type NoteIconKey = 'output' | 'blockers' | 'plan' | 'link' | 'note';
export type SyncStatus = 'ok' | 'error' | 'loading';
export type ReportType = 'daily' | 'weekly' | 'monthly';

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

export interface CompletionReport {
  output: string;
  blockers: string;
  tomorrow: string;
  link: string;
  dynamicNotes: Record<string, string>;
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

export interface AppSettings {
  weeklyHourTarget: number;
  monthlyTaskTarget: number;
}

export interface AppState {
  tasks: Task[];
  timeEntries: TimeEntry[];
  projects: string[];
  hourTypes: HourType[];
  noteFields: NoteField[];
  settings: AppSettings;
  syncStatus: SyncStatus;
  isDataLoaded: boolean;
}
```

---

## 🗄 SUPABASE DATABASE SCHEMA

The existing Supabase instance has these tables. **Do not change the table or column names** — map them exactly:

### `tasks`
| Column | Type |
|---|---|
| `id` | text (PK) |
| `name` | text |
| `project` | text |
| `hours_spent` | numeric |
| `priority` | text |
| `status` | text |
| `date_completed` | text (nullable) |
| `created_date` | text |
| `completion_report` | jsonb (nullable) |

### `time_entries`
| Column | Type |
|---|---|
| `id` | text (PK) |
| `date` | text |
| `hours` | numeric |
| `task_id` | text (nullable, FK → tasks.id) |
| `billable` | boolean |
| `project` | text |
| `description` | text |

### `settings`
| Column | Type |
|---|---|
| `id` | integer (PK, always = 1) |
| `weekly_hour_target` | integer |
| `monthly_task_target` | integer |
| `projects` | jsonb (string[]) |
| `hour_types` | jsonb (HourType[]) |
| `note_fields` | jsonb (NoteField[]) |

---

## 🧠 GLOBAL STATE (Zustand — `lib/store/useAppStore.ts`)

Implement the full store with these slices and actions. All actions must be **optimistic** — update local state immediately, then sync to Supabase in the background:

```typescript
// State slices:
// - tasks: Task[]
// - timeEntries: TimeEntry[]
// - projects: string[]
// - hourTypes: HourType[]
// - noteFields: NoteField[]
// - settings: AppSettings
// - syncStatus: SyncStatus
// - isDataLoaded: boolean

// Actions to implement:
// loadAllData()                     — fetch tasks, time_entries, settings from Supabase in parallel
// setSyncStatus(status)
// upsertTask(task)                  — optimistic update + Supabase upsert
// deleteTask(taskId)                — delete task + associated time_entries
// upsertEntry(entry)
// addProject(name)
// removeProject(idx)
// updateProjects(projects)          — save all projects + sync settings
// addHourType(ht)
// removeHourType(idx)
// updateHourTypes(types)
// addNoteField(nf)
// removeNoteField(idx)
// updateNoteFields(fields)
// advanceTaskStatus(taskId)         — cycles Not Started → In Progress → Completed
// updateSettings(settings)
```

**Important:** The `upsertSettings` call should only fire after `isDataLoaded === true` (matches original guard).

---

## 🔌 SUPABASE CLIENT SETUP (`lib/supabase/`)

- **`client.ts`**: Use `@supabase/ssr` `createBrowserClient`. Export a singleton `supabase` instance.
- **`server.ts`**: Use `createServerClient` with cookie handling for Server Components.
- **`middleware.ts`**: Export `updateSession` to refresh auth tokens on every request.
- **`middleware.ts` (root)**: Apply the middleware to all routes.

---

## 🗺 DATA MAPPERS (`lib/mappers/index.ts`)

Port these functions exactly from the original app.js:

```typescript
export function mapTaskFromDB(row: TaskRow): Task { ... }
export function mapTaskToDB(task: Task): TaskRow { ... }
export function mapEntryFromDB(row: EntryRow): TimeEntry { ... }
export function mapEntryToDB(entry: TimeEntry): EntryRow { ... }
```

Use `parseFloat()` and nullish fallbacks exactly as in the original.

---

## 🎨 STYLING MIGRATION

### CSS Variables
Port **all** CSS custom properties from `styles.css` into `app/globals.css` exactly. Do not rename them — components may reference them via inline styles or Tailwind's `[var(--name)]` syntax:

```css
:root {
  --bg-base, --bg-gradient-a/b,
  --glass-bg, --glass-strong,
  --surface, --surface-alt,
  --text-primary, --text-secondary, --text-muted,
  --accent, --accent-hover, --accent-soft,
  --success, --warning, --danger,
  --border, --border-soft,
  --shadow-sm, --shadow-md,
  --radius-sm/md/lg/pill,
  --transition
}
```

### Tailwind Strategy
- Use Tailwind utilities for layout, spacing, and responsive breakpoints.
- Use CSS variables directly for colors, borders, shadows, and radii where Tailwind doesn't cover them.
- Preserve both responsive breakpoints from the original (`@media (min-width: 900px)` and `@media (max-width: 760px)`).

---

## 📄 PAGE-BY-PAGE REQUIREMENTS

### 1. Task Board (`/taskboard`)

**Components to build:**

#### `TaskCompletionForm.tsx`
- Project selector dropdown (populated from `state.projects` + active task projects)
- Date picker (defaults to today)
- `HourBreakdownSection` — dynamically rendered fields for each `hourType` in state. Input IDs follow `hr-{code.toLowerCase()}` pattern. Step 0.25. Min 0.
- `NoteFieldsSection` — dynamically renders textarea or URL input for each `noteField`. Renders `NoteIcon` component before label. Fields marked `required` get the HTML required attribute.
- Submit button: "Submit Completion Report"
- On submit:
  1. Find active task for selected project OR create a placeholder task named "Project Work"
  2. Create one `TimeEntry` per hour type that has `hours > 0`
  3. Sum all hours, add to `task.hoursSpent`
  4. Set `task.status = 'Completed'`, `task.dateCompleted = date`
  5. Build `completionReport` from dynamic note fields
  6. Call `upsertTask` + `upsertEntry` for each new entry
  7. Show toast: "Task completed and report submitted."
  8. Reset form, reset date to today

#### `InlineAddTask.tsx`
- Task name input
- Project selector (from `state.projects`)
- Priority selector (Low / Medium / High, default Medium)
- "Add Task" button
- On submit: creates task with `status: 'In Progress'`, `hoursSpent: 0`, calls `upsertTask`, shows toast

#### `ManageProjectsModal.tsx`
- List of editable project name inputs
- Remove button (×) per project
- Add new project input + Add button (supports Enter key)
- Save Changes button: collects all inline edits, saves, closes modal
- Auto-saves on add/remove (matches original behavior)

---

### 2. Reports (`/reports`)

#### `PdfReportButtons.tsx`
Three styled report cards (Daily / Weekly / Monthly), each calling `generateReport(type)`. Port the **entire PDF generation logic** from `app.js` into `lib/pdf/generateReport.ts` with these requirements:
- Uses jsPDF + jspdf-autotable (import dynamically via `next/dynamic` or dynamic import to avoid SSR issues)
- Hardcoded: `clientName = 'Monzer'`, `freelancerName = 'Abdul Rehman'`
- Sections in order: header, KPI cards (3), Top Projects table, Time Log Details table, Completed Tasks & Delivery Notes table, footer with page numbers
- All styling (colors, fonts, column widths) must match the original exactly
- `completionReport.dynamicNotes` parsing logic must be ported verbatim (including `normalizeLabel`, `pushNote`, deduplication, label ordering)

#### `TasksTable.tsx`
- Search input (filters by task name and project, case-insensitive)
- Status filter dropdown (All / Not Started / In Progress / Completed)
- Table with columns: Status (badge), Task (bold), Project, Hours, Date + Update button
- Update button cycles task status (`advanceTaskStatus`)
- Sorted by `createdDate` descending
- Empty state when no results

#### `ProjectsDonutChart.tsx`
- Recharts `PieChart` with `innerRadius` (doughnut)
- Data: top 5 projects by total hours from `timeEntries`
- Palette: `['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed']`
- Legend on the right, styled to match original
- Shows "No Data" placeholder when no entries exist

---

### 3. Analytics (`/analytics`)

#### `KpiGrid.tsx`
Three KPI items:
- **Hours This Week**: sum of entries with `date >= 7 days ago`
- **Projects This Month**: count of unique projects in entries with `date.startsWith(currentMonthPrefix)`
- **Avg Hours/Entry**: total hours ÷ total entries (or 0)

#### `ProductivityBarChart.tsx`
- Recharts `BarChart`
- Last 7 days on X axis (formatted as M/D)
- Hours per day on Y axis
- Bar color: `rgba(79, 70, 229, 0.12)` fill, `#4f46e5` stroke
- No legend, beginAtZero Y axis

#### `ProjectBreakdownList.tsx`
- Sorted list of projects by total hours
- Each row: colored dot + project name + percentage + hours
- Max 6 projects shown
- Empty state if no data

**Metric card:** Total Hours Logged (`state.timeEntries.reduce(sum, e => sum + e.hours, 0)`)

---

## 🔔 SYNC STATUS & TOASTS

### `SyncDot.tsx`
Three visual states reading from `useAppStore`:
- `ok` → green dot with glow (`box-shadow: 0 0 8px rgba(6,153,108,0.7)`)
- `error` → red dot with glow
- `loading` → amber dot with CSS pulse animation (keyframes from original)

### Toast (Sonner)
Configure `<Toaster>` in root layout. All `showToast(message)` calls in original JS become `toast(message)` via Sonner. Match timing: ~2800ms default.

---

## 🔧 NOTE ICON SYSTEM (`lib/utils/noteIcons.ts`)

Port these functions exactly:

```typescript
export const NOTE_ICON_MAP: Record<NoteIconKey, string> // SVG strings for output/blockers/plan/link/note
export function normalizeNoteIcon(iconValue: string, label?: string): NoteIconKey
export function normalizeNoteFields(fields: NoteField[]): NoteField[]
export function noteIconMarkup(iconKey: string, label?: string): string  // returns <span> HTML string
export function noteIconOptionsMarkup(selectedKey?: string): string       // returns <option> HTML strings
```

The `NoteIcon.tsx` component should accept `iconKey: string` and render the SVG inline.

---

## 📥 DATA INITIALIZATION (`hooks/useLoadData.ts`)

```typescript
// On mount (in dashboard layout):
// 1. setSyncStatus('loading')
// 2. Load projects/hourTypes/noteFields from localStorage as immediate fallback
// 3. Fetch tasks, time_entries, settings from Supabase in parallel
// 4. On success: update store, mark isDataLoaded = true, setSyncStatus('ok')
// 5. On error: setSyncStatus('error')
// 6. If settings contains projects/hourTypes/noteFields, override localStorage cache
```

This must be called once in the **dashboard layout** using `useEffect`.

---

## 🧰 UTILITY FUNCTIONS

Port these from app.js without changes in behavior:

```typescript
// lib/utils/date.ts
export function getTodayStr(): string    // YYYY-MM-DD format, local time
export function getWeekAgoStr(): string
export function getMonthPrefix(): string // YYYY-MM

// lib/utils/id.ts
export function generateId(): string    // Math.random base36 + Date.now base36

// lib/utils/color.ts
export function hexToRgba(hex: string, alpha: number): string  // handles 3-char hex too
```

---

## 🧩 MODAL SYSTEM (`components/ui/Modal.tsx`)

Reusable modal component:
- `isOpen: boolean`, `onClose: () => void`, `title: string`, `wide?: boolean`
- Backdrop click closes the modal
- Matches original CSS: `position: fixed; inset: 0; backdrop-filter: blur(6px); z-index: 500`
- `modal-content`, `modal-wide`, `modal-header`, `modal-body` class structure

---

## 📐 LAYOUT COMPONENTS

### `TopBar.tsx`
- Logo with SVG icon + "Freelance**Tracker**" text (span colored)
- `SyncDot` component
- Stat badges: current date (from `getTodayStr()`) and today's total hours (from `timeEntries`)
- Reads today's hours live from store: `timeEntries.filter(e => e.date === today).reduce(...)`

### `BottomTabs.tsx`
- Fixed position, centered, pill shape
- Three tabs: Task Board / Reports / Analytics
- Uses Next.js `usePathname` for active state
- Uses `router.push()` for navigation (no full reload)
- SVG icons match original exactly

---

## ⚠️ CRITICAL IMPLEMENTATION RULES

1. **TypeScript strict mode** — no `any`, no `as unknown`, proper narrowing everywhere.
2. **Optimistic UI** — all state mutations happen locally before Supabase calls resolve. Sync errors show the error dot but do not roll back (matching original behavior).
3. **No SSR for dynamic UI** — the dashboard is fully client-rendered. Use `'use client'` on all interactive components. The App Router layout can be a Server Component that wraps client children.
4. **PDF generation** must be dynamically imported (`await import('jspdf')`) to avoid Node.js build errors.
5. **Chart components** must use Recharts (no Chart.js). Re-implement the same data computation but with Recharts `<BarChart>` and `<PieChart>`.
6. **Preserve all default data**:
   - Default projects: `['YPMP', 'Hudhud', 'Sakeena', 'CON-BID', 'Other', 'Mewo']`
   - Default hour types: `[{ code: 'DEV', name: 'Development', maxPercent: '', color: '#4f46e5' }, { code: 'RES', name: 'Research', maxPercent: '20', color: '#c2410c' }, { code: 'MTG', name: 'Meetings', maxPercent: '15', color: '#166534' }]`
   - Default note fields: Today's Output, Blockers, Tomorrow's Plan, Output Link
7. **localStorage persistence** — projects, hourTypes, noteFields are still cached in localStorage as offline fallback (keys: `ft_projects`, `ft_hour_types`, `ft_note_fields`).
8. **The settings row** in Supabase always has `id = 1`. Always use `.upsert({ id: 1, ... })`.
9. **Hour breakdown form** — the `id` attribute of each input must follow `hr-{code.toLowerCase()}` (e.g., `hr-dev`, `hr-res`). This is how the submission logic reads values by code.
10. **NoteFields form** — the `id` of each input/textarea must be `nf-{idx}` (zero-indexed). Detect link fields by name containing "link" (case-insensitive) and render `<input type="url">` instead of `<textarea>`.

---

## 🚀 ENVIRONMENT VARIABLES

Create `.env.local` template:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zosernlxgsqzvxxdjqwp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
```

---

## 📦 PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.4.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "sonner": "^1.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## ✅ ACCEPTANCE CRITERIA

The migration is complete when:

- [ ] All three views (Task Board, Reports, Analytics) render and navigate correctly
- [ ] Task completion form submits, creates time entries, and syncs to Supabase
- [ ] Inline task add creates a new task, updates the dropdown
- [ ] All three modals (Projects, Hour Types, Note Fields) open, edit, save, and sync settings
- [ ] PDF reports generate for daily/weekly/monthly with correct data
- [ ] Analytics charts render correctly with live data from store
- [ ] SyncDot reflects actual Supabase operation status
- [ ] Data loads from Supabase on initial mount with localStorage fallback
- [ ] All TypeScript types are strict (no `any`, no type errors on `tsc --noEmit`)
- [ ] Responsive layout matches original (glassmorphism design, bottom tabs, card grid)
- [ ] Toast notifications appear for all user actions
- [ ] `next build` completes without errors or warnings

---

*Generated by Claude for migrating a Freelance Tracker app. All business logic sourced directly from the original app.js, index.html, and styles.css.*
