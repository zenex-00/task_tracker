// ============================================================
// Supabase Configuration
// ============================================================
const SUPABASE_URL = 'https://zosernlxgsqzvxxdjqwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvc2Vybmx4Z3NxenZ4eGRqcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTkwOTEsImV4cCI6MjA5MTk5NTA5MX0.hg3N0EphK9nYeSTPnl5BYKxSMGpKtRzvOUGkcaqOD4Q';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Application State
// ============================================================
let state = {
    timeEntries: [],
    tasks: [],
    projects: [],
    hourTypes: [],
    noteFields: [],
    settings: {
        weeklyHourTarget: 40,
        monthlyTaskTarget: 100
    }
};

const NOTE_ICON_MAP = {
    output: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    blockers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12" y2="17"></line></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M3 12h12"></path><path d="M3 18h9"></path><path d="M17 17l2 2 4-4"></path></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10 5"></path><path d="M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 1 0 7.1 7.1L14 19"></path></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>'
};

// Projects are stored in localStorage for simplicity
const PROJECTS_KEY = 'ft_projects';
const HOUR_TYPES_KEY = 'ft_hour_types';
const NOTE_FIELDS_KEY = 'ft_note_fields';

function loadProjectsFromStorage() {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        if (raw) {
            state.projects = JSON.parse(raw);
        } else {
            // Default starter projects matching the screenshot
            state.projects = ['YPMP', 'Hudhud', 'Sakeena', 'CON-BID', 'Other', 'Mewo'];
            saveProjectsToStorage();
        }
    } catch(e) {
        state.projects = [];
    }
}

function saveProjectsToStorage() {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects));
    if (typeof upsertSettings === 'function') upsertSettings();
}

function loadHourTypesFromStorage() {
    try {
        const raw = localStorage.getItem(HOUR_TYPES_KEY);
        if (raw) {
            state.hourTypes = JSON.parse(raw);
        } else {
            // Default starter hour types
            state.hourTypes = [
                { code: 'DEV', name: 'Development', maxPercent: '', color: '#4f46e5' },
                { code: 'RES', name: 'Research', maxPercent: '20', color: '#c2410c' },
                { code: 'MTG', name: 'Meetings', maxPercent: '15', color: '#166534' }
            ];
            saveHourTypesToStorage();
        }
    } catch(e) {
        state.hourTypes = [];
    }
}

function saveHourTypesToStorage() {
    localStorage.setItem(HOUR_TYPES_KEY, JSON.stringify(state.hourTypes));
    if (typeof upsertSettings === 'function') upsertSettings();
}

function loadNoteFieldsFromStorage() {
    try {
        const raw = localStorage.getItem(NOTE_FIELDS_KEY);
        if (raw) {
            state.noteFields = JSON.parse(raw);
        } else {
            state.noteFields = [
                { icon: 'output', name: "Today's Output", placeholder: "What did you accomplish?", required: true, color: 'var(--success)' },
                { icon: 'blockers', name: "Blockers", placeholder: "Any blockers? How were they resolved?", required: false, color: 'var(--warning)' },
                { icon: 'plan', name: "Tomorrow's Plan", placeholder: "What's planned for tomorrow?", required: false, color: 'var(--danger)' },
                { icon: 'link', name: "Output Link", placeholder: "GitHub commit / deployed URL", required: false, color: 'var(--text-muted)' }
            ];
            saveNoteFieldsToStorage();
        }
        state.noteFields = normalizeNoteFields(state.noteFields);
    } catch(e) {
        state.noteFields = [];
    }
}

function saveNoteFieldsToStorage() {
    localStorage.setItem(NOTE_FIELDS_KEY, JSON.stringify(state.noteFields));
    if (typeof upsertSettings === 'function') upsertSettings();
}

let currentTrackedHours = 0;
let charts = {};

function normalizeNoteIcon(iconValue, label = '') {
    const v = String(iconValue || '').trim().toLowerCase();
    const n = String(label || '').toLowerCase();
    if (v.startsWith('out')) return 'output';
    if (v.startsWith('blo')) return 'blockers';
    if (v.startsWith('pla')) return 'plan';
    if (v.startsWith('lin')) return 'link';
    if (v.startsWith('not')) return 'note';
    if (v.includes('link') || v.includes('url') || n.includes('link')) return 'link';
    if (v.includes('block') || v.includes('warn') || n.includes('block')) return 'blockers';
    if (v.includes('plan') || v.includes('next') || n.includes('tomorrow') || n.includes('plan')) return 'plan';
    if (v.includes('check') || v.includes('done') || v.includes('output') || n.includes('output')) return 'output';
    return NOTE_ICON_MAP[v] ? v : 'note';
}

function normalizeNoteFields(fields = []) {
    return fields.map((nf) => ({ ...nf, icon: normalizeNoteIcon(nf.icon, nf.name) }));
}

function noteIconMarkup(iconKey, label = '') {
    const key = normalizeNoteIcon(iconKey, label);
    return `<span class="note-icon" aria-hidden="true">${NOTE_ICON_MAP[key] || NOTE_ICON_MAP.note}</span>`;
}

function noteIconOptionsMarkup(selectedKey = 'note') {
    const selected = normalizeNoteIcon(selectedKey);
    const options = [
        { value: 'output', label: 'Output' },
        { value: 'blockers', label: 'Blockers' },
        { value: 'plan', label: 'Plan' },
        { value: 'link', label: 'Link' },
        { value: 'note', label: 'Note' }
    ];
    return options
        .map((opt) => `<option value="${opt.value}" ${opt.value === selected ? 'selected' : ''}>${opt.label}</option>`)
        .join('');
}

// ============================================================
// Sync Status UI Helper
// ============================================================
function setSyncStatus(status) {
    const dot = document.getElementById('sync-status');
    if (!dot) return;
    dot.className = 'sync-dot';
    if (status === 'ok') {
        dot.classList.add('sync-ok');
        dot.title = 'Synced to cloud';
    } else if (status === 'error') {
        dot.classList.add('sync-error');
        dot.title = 'Sync error - check connection';
    } else {
        dot.classList.add('sync-loading');
        dot.title = 'Syncing...';
    }
}

// ============================================================
// Toast Notification
// ============================================================
function showToast(message, duration = 2800) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ============================================================
// On Load
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    setSyncStatus('loading');
    loadProjectsFromStorage();
    loadHourTypesFromStorage();
    loadNoteFieldsFromStorage();
    
    // Initialize UI components first so buttons are interactive immediately
    initNavigation();
    initFilters();
    initTaskCompletion();
    initProjectManager();
    initHourTypesManager();
    initNoteFieldsManager();
    updateUI();

    // Now load data from cloud
    const didLoad = await loadData();
    
    // Refresh UI with cloud data
    updateUI();
    if (didLoad) setSyncStatus('ok');
});

// ============================================================
// Data Management - Supabase
// ============================================================

async function loadData() {
    try {
        const [tasksRes, entriesRes, settingsRes] = await Promise.all([
            _supabase.from('tasks').select('*').order('created_date', { ascending: false }),
            _supabase.from('time_entries').select('*').order('date', { ascending: false }),
            _supabase.from('settings').select('*').eq('id', 1).single()
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (entriesRes.error) throw entriesRes.error;

        state.tasks = (tasksRes.data || []).map(mapTaskFromDB);
        state.timeEntries = (entriesRes.data || []).map(mapEntryFromDB);

        if (settingsRes.data) {
            state.settings.weeklyHourTarget = settingsRes.data.weekly_hour_target;
            state.settings.monthlyTaskTarget = settingsRes.data.monthly_task_target;

            if (settingsRes.data.projects && settingsRes.data.projects.length) {
                state.projects = settingsRes.data.projects;
                localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects));
            }
            if (settingsRes.data.hour_types && settingsRes.data.hour_types.length) {
                state.hourTypes = settingsRes.data.hour_types;
                localStorage.setItem(HOUR_TYPES_KEY, JSON.stringify(state.hourTypes));
            }
            if (settingsRes.data.note_fields && settingsRes.data.note_fields.length) {
                state.noteFields = normalizeNoteFields(settingsRes.data.note_fields);
                localStorage.setItem(NOTE_FIELDS_KEY, JSON.stringify(state.noteFields));
            }
        }
        isDataLoaded = true;
        return true;
    } catch (err) {
        console.error('Error loading data from Supabase:', err);
        setSyncStatus('error');
        return false;
    }
}

// --- Mappers: DB (snake_case) <-> State (camelCase) ---

function mapTaskFromDB(row) {
    return {
        id: row.id,
        name: row.name,
        project: row.project || 'General',
        hoursSpent: parseFloat(row.hours_spent) || 0,
        priority: row.priority || 'Medium',
        status: row.status || 'Not Started',
        dateCompleted: row.date_completed || null,
        createdDate: row.created_date || getTodayStr(),
        completionReport: row.completion_report || null
    };
}

function mapTaskToDB(task) {
    return {
        id: task.id,
        name: task.name,
        project: task.project,
        hours_spent: task.hoursSpent,
        priority: task.priority,
        status: task.status,
        date_completed: task.dateCompleted || null,
        created_date: task.createdDate,
        completion_report: task.completionReport || null
    };
}

function mapEntryFromDB(row) {
    return {
        id: row.id,
        date: row.date,
        hours: parseFloat(row.hours) || 0,
        taskId: row.task_id || null,
        billable: row.billable,
        project: row.project || 'General',
        description: row.description || ''
    };
}

function mapEntryToDB(entry) {
    return {
        id: entry.id,
        date: entry.date,
        hours: entry.hours,
        task_id: entry.taskId || null,
        billable: entry.billable,
        project: entry.project,
        description: entry.description
    };
}

// --- Save / Upsert Operations ---

async function upsertTask(task) {
    setSyncStatus('loading');
    const { error } = await _supabase.from('tasks').upsert(mapTaskToDB(task));
    if (error) { console.error('Task upsert error:', error); setSyncStatus('error'); return false; }
    setSyncStatus('ok');
    return true;
}

async function upsertEntry(entry) {
    setSyncStatus('loading');
    const { error } = await _supabase.from('time_entries').upsert(mapEntryToDB(entry));
    if (error) { console.error('Entry upsert error:', error); setSyncStatus('error'); return false; }
    setSyncStatus('ok');
    return true;
}

let isDataLoaded = false;
async function upsertSettings() {
    if (!isDataLoaded) return true;
    setSyncStatus('loading');
    const { error } = await _supabase.from('settings').upsert({
        id: 1,
        projects: state.projects,
        hour_types: state.hourTypes,
        note_fields: state.noteFields
    });
    if (error) { console.error('Settings upsert error:', error); setSyncStatus('error'); return false; }
    setSyncStatus('ok');
    return true;
}

async function deleteTaskFromDB(taskId) {
    setSyncStatus('loading');
    await _supabase.from('tasks').delete().eq('id', taskId);
    await _supabase.from('time_entries').delete().eq('task_id', taskId);
    setSyncStatus('ok');
}

// ============================================================
// Utility Helpers
// ============================================================

function generateId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// ============================================================
// Navigation
// ============================================================

function initNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => {
                v.classList.add('hidden');
                v.classList.remove('active');
            });
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }

            // Refresh analytics when navigating to it
            if (targetId === 'view-analytics') {
                updateAnalytics();
                setTimeout(() => {
                    if (charts.productivityChart) charts.productivityChart.resize();
                    if (charts.projectsChart) charts.projectsChart.resize();
                }, 50);
            }
            if (targetId === 'view-reports') {
                setTimeout(() => {
                    if (charts.projectsChart) charts.projectsChart.resize();
                }, 50);
            }
        });
    });
}

// ============================================================
// Quick Time Tracker
// ============================================================

function initTimeTracker() {
    const btnInc = document.getElementById('btn-inc-time');
    if (btnInc) btnInc.addEventListener('click', () => {
        currentTrackedHours += 0.25;
        updateTrackerDisplay();
    });

    const btnDec = document.getElementById('btn-dec-time');
    if (btnDec) btnDec.addEventListener('click', () => {
        if (currentTrackedHours >= 0.25) {
            currentTrackedHours -= 0.25;
            updateTrackerDisplay();
        }
    });

    const btnLog = document.getElementById('btn-log-time');
    if (btnLog) btnLog.addEventListener('click', async () => {
        if (currentTrackedHours === 0) {
            showToast('Please add at least 15 minutes first.');
            return;
        }

        const project = document.getElementById('quick-track-project').value.trim() || 'General';
        const isBillable = document.getElementById('quick-track-billable').checked;
        const description = document.getElementById('quick-track-description').value.trim();

        const entry = {
            id: generateId(),
            date: getTodayStr(),
            hours: currentTrackedHours,
            taskId: null,
            billable: isBillable,
            project: project,
            description: description
        };

        state.timeEntries.unshift(entry);
        currentTrackedHours = 0;
        document.getElementById('quick-track-project').value = '';
        document.getElementById('quick-track-description').value = '';
        updateTrackerDisplay();
        updateUI();
        showToast(`Logged ${entry.hours.toFixed(2)}h for ${entry.project}`);

        await upsertEntry(entry);
    });
}

function updateTrackerDisplay() {
    document.getElementById('quick-track-current').textContent = currentTrackedHours.toFixed(2);
}

// ============================================================
// Task Management
// ============================================================

function initTaskForm() {
    const form = document.getElementById('form-add-task');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('task-name').value.trim();
        const project = document.getElementById('task-project').value.trim() || 'General';
        const hours = parseFloat(document.getElementById('task-hours').value) || 0;
        const priority = document.getElementById('task-priority').value;
        const status = document.getElementById('task-status').value;

        const taskId = generateId();
        const dateCompleted = status === 'Completed' ? getTodayStr() : null;

        const task = {
            id: taskId,
            name,
            project,
            hoursSpent: hours,
            priority,
            status,
            dateCompleted,
            createdDate: getTodayStr(),
            completionReport: null
        };

        state.tasks.unshift(task);

        let entry = null;
        if (hours > 0) {
            entry = {
                id: generateId(),
                date: getTodayStr(),
                hours: hours,
                taskId: taskId,
                billable: true,
                project: project,
                description: `Worked on task: ${name}`
            };
            state.timeEntries.unshift(entry);
        }

        e.target.reset();
        updateUI();
        showToast(`Task "${name}" added.`);

        await upsertTask(task);
        if (entry) await upsertEntry(entry);
    });
}

function initFilters() {
    const search = document.getElementById('filter-search');
    const status = document.getElementById('filter-status');
    if (search) search.addEventListener('input', renderTasksList);
    if (status) status.addEventListener('change', renderTasksList);
}

function renderTasksList() {
    const tbody = document.getElementById('tasks-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('filter-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    let filtered = [...state.tasks].sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    if (searchTerm) {
        filtered = filtered.filter(t => t.name.toLowerCase().includes(searchTerm) || t.project.toLowerCase().includes(searchTerm));
    }
    if (statusFilter !== 'All') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color:var(--text-secondary);">No tasks found - add tasks in the Task Board.</td></tr>';
        return;
    }

    filtered.forEach(t => {
        let statusClass = 'badge-notstarted';
        if (t.status === 'Completed') statusClass = 'badge-completed';
        else if (t.status === 'In Progress') statusClass = 'badge-progress';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge ${statusClass}">${t.status}</span></td>
            <td><strong style="color:var(--text-primary)">${t.name}</strong></td>
            <td style="color:var(--text-secondary)">${t.project}</td>
            <td><strong>${t.hoursSpent.toFixed(2)}h</strong></td>
            <td>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="font-size:0.85rem; color:var(--text-secondary)">${t.createdDate}</span>
                    <button onclick="updateTaskStatus('${t.id}')" style="background:var(--accent-light); color:var(--accent-primary); font-size:0.72rem; border-radius:var(--radius-full); padding:3px 8px; font-weight:700; border:1px solid rgba(79,70,229,0.2);">Update</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateTaskStatus = async (taskId) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const statuses = ['Not Started', 'In Progress', 'Completed'];
    let nextIdx = (statuses.indexOf(task.status) + 1) % statuses.length;
    task.status = statuses[nextIdx];

    if (task.status === 'Completed' && !task.dateCompleted) {
        task.dateCompleted = getTodayStr();
    }

    updateUI();
    showToast(`Task moved to: ${task.status}`);
    await upsertTask(task);
};

// ============================================================
// Detailed Task Completion
// ============================================================



function initTaskCompletion() {
    const dateInput = document.getElementById('completion-date');
    if (dateInput) dateInput.value = getTodayStr();

    // Inline Add Task button creates a task and auto-selects it
    const btnAddInline = document.getElementById('btn-add-task-inline');
    if (btnAddInline) {
        btnAddInline.addEventListener('click', async () => {
            const nameInput = document.getElementById('new-task-name');
            const name = nameInput.value.trim();
            if (!name) { showToast('Please enter a task name.'); nameInput.focus(); return; }

            const projectSelect = document.getElementById('new-task-project');
            const project = (projectSelect && projectSelect.value) ? projectSelect.value : 'General';
            const priority = document.getElementById('new-task-priority').value;
            const taskId   = generateId();

            const task = {
                id: taskId,
                name,
                project,
                hoursSpent: 0,
                priority,
                status: 'In Progress',
                dateCompleted: null,
                createdDate: getTodayStr(),
                completionReport: null
            };

            state.tasks.unshift(task);
            updateTaskCompletionDropdown();

            // Auto-select the new task's project
            const select = document.getElementById('completion-task-select');
            if (select) select.value = project;

            // Clear the inline fields
            nameInput.value = '';
            if (projectSelect) projectSelect.value = '';
            document.getElementById('new-task-priority').value = 'Medium';

            showToast(`Task "${name}" added to project "${project}".`);
            await upsertTask(task);
        });
    }


    const form = document.getElementById('form-task-completion');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedProject = document.getElementById('completion-task-select').value;
            if (!selectedProject) { showToast('Please select a project.'); return; }

            // Find active tasks for this project, or create a placeholder task if none
            let task = state.tasks.find(t => t.project === selectedProject && t.status !== 'Completed');
            if (!task) {
                // Create a placeholder task for this project
                const taskId = generateId();
                task = {
                    id: taskId,
                    name: 'Project Work',
                    project: selectedProject,
                    hoursSpent: 0,
                    priority: 'Medium',
                    status: 'In Progress',
                    dateCompleted: null,
                    createdDate: getTodayStr(),
                    completionReport: null
                };
                state.tasks.unshift(task);
                await upsertTask(task);
            }

            const date = document.getElementById('completion-date').value;

            const newEntries = [];
            state.hourTypes.forEach(ht => {
                const hrInput = document.getElementById(`hr-${ht.code.toLowerCase()}`);
                const hrVal = hrInput ? (parseFloat(hrInput.value) || 0) : 0;
                if (hrVal > 0) {
                    newEntries.push({ id: generateId(), date, hours: hrVal, taskId: task.id, billable: true, project: task.project, description: `${ht.name}: ` + task.name });
                }
            });

            newEntries.forEach(entry => state.timeEntries.unshift(entry));

            // Update task's hoursSpent with total hours from the breakdown
            const totalSubmittedHours = newEntries.reduce((sum, e) => sum + e.hours, 0);
            task.hoursSpent = (task.hoursSpent || 0) + totalSubmittedHours;

            task.status = 'Completed';
            task.dateCompleted = date;
            
            const dynamicNotes = {};
            state.noteFields.forEach((nf, idx) => {
                const el = document.getElementById(`nf-${idx}`);
                if (el) dynamicNotes[nf.name] = el.value;
            });

            task.completionReport = {
                output: dynamicNotes["Today's Output"] || "",
                blockers: dynamicNotes["Blockers"] || "",
                tomorrow: dynamicNotes["Tomorrow's Plan"] || "",
                link: dynamicNotes["Output Link"] || "",
                dynamicNotes: dynamicNotes
            };

            updateUI();
            form.reset();
            document.getElementById('completion-date').value = getTodayStr();

            // Sync
            await upsertTask(task);
            for (const entry of newEntries) await upsertEntry(entry);

            showToast('Task completed and report submitted.');
        });
    }
}


function updateTaskCompletionDropdown() {
    const select = document.getElementById('completion-task-select');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- Choose a project --</option>';
    // Show unique projects from active tasks + managed projects
    const projectSet = new Set(state.projects);
    state.tasks.filter(t => t.status !== 'Completed').forEach(t => projectSet.add(t.project));
    projectSet.forEach(proj => {
        const opt = document.createElement('option');
        opt.value = proj;
        opt.textContent = proj;
        select.appendChild(opt);
    });
}

// ============================================================
// UI & KPIs Updates
// ============================================================

function updateUI() {
    updateTopBar();
    updateTodayLogs();
    updateKPIs();
    renderTasksList();
    updateProjectDatalist();
    updateProjectDropdowns();
    updateTaskCompletionDropdown();
    renderProjectsList();
    renderHourTypesList();
    renderHourBreakdownFields();
    renderNoteFieldsList();
    renderNoteBreakdownFields();
    updateCharts();
}

function updateTodayLogs() {
    const list = document.getElementById('today-logs-list');
    if (!list) return;

    const today = getTodayStr();
    const todayEntries = state.timeEntries.filter(e => e.date === today);

    if (todayEntries.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-4" style="font-size:0.88rem;">No time logged today yet.</p>';
        return;
    }

    list.innerHTML = '';
    [...todayEntries].forEach(e => {
        const div = document.createElement('div');
        div.className = `log-item ${e.billable ? '' : 'non-billable'}`;
        div.innerHTML = `
            <div class="log-title">
                <span>${e.project || 'General'}</span>
                <span style="color:var(--accent-primary)">${e.hours.toFixed(2)} hrs</span>
            </div>
            <div class="log-desc">${e.description || '<i>No details</i>'}</div>
        `;
        list.appendChild(div);
    });
}

function updateTopBar() {
    const today = getTodayStr();
    document.getElementById('current-date').textContent = today;

    const todayEntries = state.timeEntries.filter(e => e.date === today);
    const todayHours = todayEntries.reduce((sum, e) => sum + e.hours, 0);
    document.getElementById('today-hours').textContent = todayHours.toFixed(2);
}

function updateKPIs() {
    const today = new Date();

    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];

    const weekEntries = state.timeEntries.filter(e => e.date >= weekStr);
    const weekHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);
    const kpiWeekHours = document.getElementById('kpi-week-hours');
    if (kpiWeekHours) kpiWeekHours.textContent = weekHours.toFixed(1) + 'h';

    const currentMonthPrefix = getTodayStr().substring(0, 7);
    const monthEntries = state.timeEntries.filter(e => e.date && e.date.startsWith(currentMonthPrefix));
    const monthProjects = new Set(monthEntries.map(e => e.project).filter(Boolean));
    const kpiMonthProjects = document.getElementById('kpi-month-projects');
    if (kpiMonthProjects) kpiMonthProjects.textContent = monthProjects.size;

    const kpiAvgTime = document.getElementById('kpi-avg-time');
    const avg = state.timeEntries.length > 0
        ? state.timeEntries.reduce((sum, e) => sum + e.hours, 0) / state.timeEntries.length
        : 0;
    if (kpiAvgTime) kpiAvgTime.textContent = avg.toFixed(1) + 'h';

}

function updateProjectDatalist() {
    const list = document.getElementById('project-list');
    if (!list) return;
    list.innerHTML = '';
    const projects = new Set([...state.projects]);
    state.tasks.forEach(t => projects.add(t.project));
    state.timeEntries.forEach(e => projects.add(e.project));
    projects.forEach(p => {
        if (p) {
            const opt = document.createElement('option');
            opt.value = p;
            list.appendChild(opt);
        }
    });
}

// ============================================================
// Project Manager
// ============================================================

function renderProjectsList() {
    const container = document.getElementById('projects-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.projects.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); font-size:0.88rem; text-align:center; padding:1rem 0;">No projects yet. Add one below!</p>';
        return;
    }

    state.projects.forEach((proj, idx) => {
        const row = document.createElement('div');
        row.className = 'project-manage-row';
        row.innerHTML = `
            <input type="text" class="project-name-input" value="${proj}" data-idx="${idx}" placeholder="Project name">
            <button class="btn-remove-project" data-idx="${idx}" title="Remove project">&times;</button>
        `;
        container.appendChild(row);
    });

    // Bind remove buttons
    container.querySelectorAll('.btn-remove-project').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const removed = state.projects.splice(idx, 1);
            saveProjectsToStorage(); // Auto-save on removal
            renderProjectsList();
            updateProjectDropdowns();
            updateTaskCompletionDropdown();
            showToast(`Project "${removed}" removed.`);
        });
    });
}

function updateProjectDropdowns() {
    // Update the "Project" select in the Add Task row
    const taskProjectSelect = document.getElementById('new-task-project');
    if (taskProjectSelect) {
        taskProjectSelect.innerHTML = '<option value="">-- Select Project --</option>';
        state.projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            taskProjectSelect.appendChild(opt);
        });
    }
}

function initProjectManager() {
    // Modal logic
    const modal = document.getElementById('modal-manage-projects');
    const btnOpen = document.getElementById('btn-open-manage-projects');
    const btnClose = document.getElementById('btn-close-manage-projects');

    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Close when clicking outside content
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    const btnAdd = document.getElementById('btn-add-project');
    const input  = document.getElementById('new-project-input');
    const btnSave = document.getElementById('btn-save-projects');

    if (btnAdd && input) {
        const doAdd = () => {
            const val = input.value.trim();
            if (!val) { showToast('Enter a project name first.'); input.focus(); return; }
            if (state.projects.includes(val)) { showToast('Project already exists.'); return; }
            state.projects.push(val);
            input.value = '';
            
            saveProjectsToStorage(); // Auto-save on addition
            renderProjectsList();
            updateProjectDropdowns();
            updateTaskCompletionDropdown();
            showToast(`Project "${val}" added.`);
        };
        btnAdd.addEventListener('click', doAdd);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            // Collect any inline edits from the name inputs
            const nameInputs = document.querySelectorAll('.project-name-input');
            nameInputs.forEach(inp => {
                const idx = parseInt(inp.getAttribute('data-idx'));
                const val = inp.value.trim();
                if (val && idx >= 0 && idx < state.projects.length) {
                    state.projects[idx] = val;
                }
            });

            saveProjectsToStorage();
            renderProjectsList();
            updateProjectDropdowns();
            updateTaskCompletionDropdown();
            showToast('Projects saved.');
            
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
}

// ============================================================
// Hour Types Manager
// ============================================================

function initHourTypesManager() {
    const modal = document.getElementById('modal-manage-hour-types');
    const btnOpen = document.getElementById('btn-open-manage-hour-types');
    const btnClose = document.getElementById('btn-close-hour-types');

    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    const btnAdd = document.getElementById('btn-add-hour-type');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const codeInput = document.getElementById('new-ht-code');
            const nameInput = document.getElementById('new-ht-name');
            const maxInput = document.getElementById('new-ht-max');
            const colorInput = document.getElementById('new-ht-color');

            const code = codeInput.value.trim().toUpperCase();
            const name = nameInput.value.trim();
            const max = maxInput.value.trim();
            const color = colorInput.value;

            if (!code || !name) { showToast('Enter a code and name.'); return; }
            if (state.hourTypes.some(ht => ht.code === code)) { showToast('Code already exists.'); return; }

            state.hourTypes.push({ code, name, maxPercent: max, color });
            
            codeInput.value = '';
            nameInput.value = '';
            maxInput.value = '';
            
            saveHourTypesToStorage();
            renderHourTypesList();
            renderHourBreakdownFields();
            showToast(`Hour type "${code}" added.`);
        });
    }

    const btnSave = document.getElementById('btn-save-hour-types');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const container = document.getElementById('hour-types-list-container');
            const rows = container.querySelectorAll('.project-manage-row');
            rows.forEach(row => {
                const idx = parseInt(row.getAttribute('data-idx'));
                if (idx >= 0 && idx < state.hourTypes.length) {
                    state.hourTypes[idx].code = row.querySelector('.ht-code-input').value.trim().toUpperCase();
                    state.hourTypes[idx].name = row.querySelector('.ht-name-input').value.trim();
                    state.hourTypes[idx].maxPercent = row.querySelector('.ht-max-input').value.trim();
                    state.hourTypes[idx].color = row.querySelector('.ht-color-input').value;
                }
            });

            saveHourTypesToStorage();
            renderHourTypesList();
            renderHourBreakdownFields();
            showToast('Hour types saved.');
            if (modal) modal.classList.add('hidden');
        });
    }
}

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderHourTypesList() {
    const container = document.getElementById('hour-types-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.hourTypes.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); font-size:0.88rem; text-align:center; padding:1rem 0;">No hour types yet. Add one below!</p>';
        return;
    }

    state.hourTypes.forEach((ht, idx) => {
        const row = document.createElement('div');
        row.className = 'project-manage-row';
        row.dataset.idx = idx;
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        
        row.innerHTML = `
            <input type="text" class="ht-code-input" value="${ht.code}" placeholder="Code" maxlength="4" style="flex: 1;" autocomplete="off">
            <input type="text" class="ht-name-input" value="${ht.name}" placeholder="Name" style="flex: 2;" autocomplete="off">
            <input type="number" class="ht-max-input" value="${ht.maxPercent}" placeholder="Max%" style="width: 70px;" min="0" max="100">
            <input type="color" class="ht-color-input" value="${ht.color}" style="width: 42px; height: 42px; cursor: pointer; padding: 2px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <button type="button" class="btn-remove-ht btn-remove-project" data-idx="${idx}" title="Remove hour type" style="padding: 0; width: 42px; height: 42px; display:flex; justify-content:center; align-items:center; background:#fef2f2; color:#ef4444; border: 1px solid #fecaca; margin-left: auto;">&times;</button>
        `;
        container.appendChild(row);
    });

    container.querySelectorAll('.btn-remove-ht').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.hourTypes.length <= 1) {
                showToast('At least one hour type is required.');
                return;
            }
            const idx = parseInt(btn.getAttribute('data-idx'));
            const removed = state.hourTypes.splice(idx, 1);
            saveHourTypesToStorage();
            renderHourTypesList();
            renderHourBreakdownFields();
            showToast(`Hour type "${removed[0].code}" removed.`);
        });
    });
}

function renderHourBreakdownFields() {
    const container = document.getElementById('hour-breakdown-container');
    if (!container) return;
    container.innerHTML = '';

    state.hourTypes.forEach(ht => {
        const bgVal = hexToRgba(ht.color, 0.1);

        const div = document.createElement('div');
        div.className = 'hour-row';
        div.innerHTML = `
            <input type="number" id="hr-${ht.code.toLowerCase()}" min="0" step="0.25" placeholder="0">
            <div class="hour-row-label">
                ${ht.name}
            </div>
            <span class="badge" style="background:${bgVal}; color:${ht.color};">${ht.code}</span>
        `;
        container.appendChild(div);
    });
}

// ============================================================
// Note Fields Manager
// ============================================================

function initNoteFieldsManager() {
    const modal = document.getElementById('modal-manage-note-fields');
    const btnOpen = document.getElementById('btn-open-manage-note-fields');
    const btnClose = document.getElementById('btn-close-note-fields');

    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    const btnAdd = document.getElementById('btn-add-note-field');
    const addIconSelect = document.getElementById('new-nf-icon');
    const addIconPreview = document.getElementById('new-nf-icon-preview');

    const renderAddIconPreview = () => {
        if (!addIconSelect || !addIconPreview) return;
        const selectedIcon = normalizeNoteIcon(addIconSelect.value || 'output');
        addIconPreview.innerHTML = NOTE_ICON_MAP[selectedIcon] || NOTE_ICON_MAP.note;
    };

    if (addIconSelect) {
        addIconSelect.addEventListener('change', renderAddIconPreview);
    }
    renderAddIconPreview();

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const iconInput = document.getElementById('new-nf-icon');
            const nameInput = document.getElementById('new-nf-name');
            const plInput = document.getElementById('new-nf-placeholder');

            const icon = iconInput.value || 'note';
            const name = nameInput.value.trim();
            const placeholder = plInput.value.trim();

            if (!name) { showToast('Enter a label for the field.'); return; }
            if (state.noteFields.some(nf => nf.name.toLowerCase() === name.toLowerCase())) { showToast('Field name already exists.'); return; }

            state.noteFields.push({ icon: normalizeNoteIcon(icon, name), name, placeholder, required: false, color: 'var(--text-primary)' });
            
            iconInput.value = 'output';
            renderAddIconPreview();
            nameInput.value = '';
            plInput.value = '';
            
            saveNoteFieldsToStorage();
            renderNoteFieldsList();
            renderNoteBreakdownFields();
            showToast(`Note field "${name}" added.`);
        });
    }

    const btnSave = document.getElementById('btn-save-note-fields');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const container = document.getElementById('note-fields-list-container');
            const rows = container.querySelectorAll('.project-manage-row');
            rows.forEach(row => {
                const idx = parseInt(row.getAttribute('data-idx'));
                if (idx >= 0 && idx < state.noteFields.length) {
                    state.noteFields[idx].icon = normalizeNoteIcon(row.querySelector('.nf-icon-input').value.trim(), row.querySelector('.nf-name-input').value.trim());
                    state.noteFields[idx].name = row.querySelector('.nf-name-input').value.trim();
                    state.noteFields[idx].required = row.querySelector('.nf-req-input').checked;
                }
            });

            saveNoteFieldsToStorage();
            renderNoteFieldsList();
            renderNoteBreakdownFields();
            showToast('Note fields saved.');
            if (modal) modal.classList.add('hidden');
        });
    }
}

function renderNoteFieldsList() {
    const container = document.getElementById('note-fields-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.noteFields.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); font-size:0.88rem; text-align:center; padding:1rem 0;">No fields. Add one below!</p>';
        return;
    }

    state.noteFields.forEach((nf, idx) => {
        const row = document.createElement('div');
        row.className = 'project-manage-row';
        row.dataset.idx = idx;
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        
        const iconKey = normalizeNoteIcon(nf.icon, nf.name);
        row.innerHTML = `
            <div class="nf-icon-cell">
                <span class="note-icon note-icon-preview" aria-hidden="true">${NOTE_ICON_MAP[iconKey] || NOTE_ICON_MAP.note}</span>
                <select class="nf-icon-input">${noteIconOptionsMarkup(iconKey)}</select>
            </div>
            <input type="text" class="nf-name-input" value="${nf.name}" placeholder="Name" style="flex: 1;" autocomplete="off">
            <div style="display:flex; align-items:center; gap:0.25rem;">
                <input type="checkbox" class="nf-req-input" ${nf.required ? 'checked' : ''} style="width:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">Req</span>
            </div>
            <button type="button" class="btn-remove-nf btn-remove-project" data-idx="${idx}" title="Remove field" style="padding: 0; width: 42px; height: 42px; display:flex; justify-content:center; align-items:center; background:#fef2f2; color:#ef4444; border: 1px solid #fecaca; margin-left: auto;">&times;</button>
        `;
        container.appendChild(row);

        const iconSelect = row.querySelector('.nf-icon-input');
        const iconPreview = row.querySelector('.note-icon-preview');
        if (iconSelect && iconPreview) {
            iconSelect.addEventListener('change', () => {
                const selectedIcon = normalizeNoteIcon(iconSelect.value);
                iconPreview.innerHTML = NOTE_ICON_MAP[selectedIcon] || NOTE_ICON_MAP.note;
            });
        }
    });

    container.querySelectorAll('.btn-remove-nf').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const removed = state.noteFields.splice(idx, 1);
            saveNoteFieldsToStorage();
            renderNoteFieldsList();
            renderNoteBreakdownFields();
            showToast(`Field "${removed[0].name}" removed.`);
        });
    });
}

function renderNoteBreakdownFields() {
    const container = document.getElementById('note-fields-container');
    if (!container) return;
    container.innerHTML = '';

    state.noteFields.forEach((nf, idx) => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const labelHtml = `<label for="nf-${idx}" style="color:${nf.color || 'var(--text-primary)'};">${noteIconMarkup(nf.icon, nf.name)}${nf.name} ${nf.required ? '*' : ''}</label>`;
        
        const inputHtml = (nf.name === 'Output Link' || nf.name.toLowerCase().includes('link'))
            ? `<input type="url" id="nf-${idx}" placeholder="${nf.placeholder || ''}" ${nf.required ? 'required' : ''}>`
            : `<textarea id="nf-${idx}" rows="2" placeholder="${nf.placeholder || ''}" ${nf.required ? 'required' : ''}></textarea>`;
            
        div.innerHTML = labelHtml + inputHtml;
        container.appendChild(div);
    });
}

// ============================================================
// Analytics Page
// ============================================================

window.refreshAnalytics = function() {
    updateAnalytics();
    showToast('Analytics refreshed.');
};

function updateAnalytics() {
    updateKPIs(); // reuse KPI updater for analytics page too

    const totalHours = state.timeEntries.reduce((sum, e) => sum + e.hours, 0);

    // Top metric cards
    const anTotalHours = document.getElementById('an-total-hours');
    if (anTotalHours) anTotalHours.textContent = totalHours.toFixed(1) + 'h';

    // Project breakdown
    renderProjectBreakdown();

}


function renderProjectBreakdown() {
    const container = document.getElementById('an-project-list');
    if (!container) return;

    const projMap = {};
    state.timeEntries.forEach(e => {
        const p = e.project || 'General';
        projMap[p] = (projMap[p] || 0) + e.hours;
    });

    const sorted = Object.entries(projMap).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg></span><p>No project data yet</p></div>';
        return;
    }

    const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
    const totalHours = sorted.reduce((sum, [, h]) => sum + h, 0);
    container.innerHTML = '';

    sorted.slice(0, 6).forEach(([name, hours], i) => {
        const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : 0;
        const row = document.createElement('div');
        row.className = 'project-row';
        row.innerHTML = `
            <div class="project-dot" style="background:${colors[i % colors.length]}"></div>
            <span class="project-name">${name}</span>
            <span style="font-size:0.78rem; color:var(--text-secondary);">${pct}%</span>
            <span class="project-hours">${hours.toFixed(1)}h</span>
        `;
        container.appendChild(row);
    });
}

// ============================================================
// Charts
// ============================================================

function updateCharts() {
    if (typeof Chart === 'undefined') return;
    updateProductivityChart();
    updateProjectsChart();
}

function updateProductivityChart() {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;

    const labels = [];
    const dataPoints = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        let sum = state.timeEntries.filter(e => e.date === dateStr).reduce((s, e) => s + e.hours, 0);
        dataPoints.push(sum);
    }

    if (charts.productivityChart) {
        charts.productivityChart.data.labels = labels;
        charts.productivityChart.data.datasets[0].data = dataPoints;
        charts.productivityChart.update();
    } else {
        Chart.defaults.color = '#9ca3af';
        Chart.defaults.font.family = 'Inter';
        charts.productivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Hours Worked',
                    data: dataPoints,
                    backgroundColor: 'rgba(79, 70, 229, 0.12)',
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(79, 70, 229, 0.25)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });
    }
}

function updateProjectsChart() {
    const ctx = document.getElementById('projectsChart');
    if (!ctx) return;

    const projMap = {};
    state.timeEntries.forEach(e => {
        const p = e.project || 'General';
        projMap[p] = (projMap[p] || 0) + e.hours;
    });

    const labels = Object.keys(projMap);
    const dataPoints = Object.values(projMap);
    const sorted = labels.map((l, i) => ({ l, d: dataPoints[i] })).sort((a, b) => b.d - a.d);

    const topLabels = sorted.slice(0, 5).map(i => i.l);
    const topData   = sorted.slice(0, 5).map(i => i.d);

    if (topLabels.length === 0) { topLabels.push('No Data'); topData.push(1); }

    const palette = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed'];

    if (charts.projectsChart) {
        charts.projectsChart.data.labels = topLabels;
        charts.projectsChart.data.datasets[0].data = topData;
        charts.projectsChart.update();
    } else {
        charts.projectsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topLabels,
                datasets: [{
                    data: topData,
                    backgroundColor: palette,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#6b7280', font: { family: 'Inter', weight: '600' }, boxWidth: 12 }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

window.onload = () => {
    setTimeout(updateCharts, 600);
    setTimeout(() => {
        const analyticsVisible = document.getElementById('view-analytics') && !document.getElementById('view-analytics').classList.contains('hidden');
        if (analyticsVisible) updateAnalytics();
    }, 700);
};

// ============================================================
// Reporting (PDF)
// ============================================================

window.generateReport = function(type) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF library not loaded yet. Try again in a moment.');
        return;
    }

    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const today = getTodayStr();
    const clientName = 'Monzer';
    const freelancerName = 'Abdul Rehman';

    let reportLabel = 'Performance Report';
    let periodLabel = 'All Time';
    let entriesFilter = () => true;
    let tasksFilter = () => true;

    if (type === 'daily') {
        reportLabel = 'Daily Activity Report';
        periodLabel = today;
        entriesFilter = (e) => e.date === today;
        tasksFilter = (t) => t.dateCompleted === today || t.createdDate === today;
    } else if (type === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split('T')[0];
        reportLabel = 'Weekly Progress Report';
        periodLabel = weekStr + ' to ' + today;
        entriesFilter = (e) => e.date >= weekStr && e.date <= today;
        tasksFilter = (t) => (t.dateCompleted && t.dateCompleted >= weekStr && t.dateCompleted <= today) || (t.createdDate && t.createdDate >= weekStr && t.createdDate <= today);
    } else if (type === 'monthly') {
        const monthPrefix = today.substring(0, 7);
        reportLabel = 'Monthly Delivery Report';
        periodLabel = monthPrefix;
        entriesFilter = (e) => e.date && e.date.startsWith(monthPrefix);
        tasksFilter = (t) => (t.dateCompleted && t.dateCompleted.startsWith(monthPrefix)) || (t.createdDate && t.createdDate.startsWith(monthPrefix));
    }

    const filteredEntries = state.timeEntries.filter(entriesFilter);
    const filteredTasks = state.tasks.filter(tasksFilter);

    const totalHours = filteredEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const projectHours = {};
    filteredEntries.forEach((e) => {
        const key = e.project || 'General';
        projectHours[key] = (projectHours[key] || 0) + (Number(e.hours) || 0);
    });
    const topProjects = Object.entries(projectHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const drawHeader = () => {
        doc.setFillColor(16, 24, 40);
        doc.rect(0, 0, pageWidth, 38, 'F');
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 34, pageWidth, 4, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Professional Work Report', margin, 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(reportLabel, margin, 21);
        doc.text('Period: ' + periodLabel, margin, 27);
        doc.text('Generated: ' + new Date().toLocaleString(), margin, 32);

        doc.setFont('helvetica', 'bold');
        doc.text('Client: ' + clientName, pageWidth - margin, 18, { align: 'right' });
        doc.text('Prepared by: ' + freelancerName, pageWidth - margin, 25, { align: 'right' });
    };

    const drawFooter = (pageNo) => {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Confidential | ' + clientName + ' x ' + freelancerName, margin, pageHeight - 5);
        doc.text('Page ' + pageNo, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };

    const drawKpiCard = (x, y, w, h, label, value, tint) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 2, 2, 'S');
        doc.setFillColor(tint[0], tint[1], tint[2]);
        doc.rect(x, y, 2.5, h, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(String(value), x + 5, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(label, x + 5, y + 14);
    };

    drawHeader();

    const cardY = 44;
    const cardGap = 4;
    const cardW = (pageWidth - (margin * 2) - (cardGap * 2)) / 3;
    const cardH = 18;

    drawKpiCard(margin, cardY, cardW, cardH, 'Total Hours', totalHours.toFixed(2), [37, 99, 235]);
    drawKpiCard(margin + cardW + cardGap, cardY, cardW, cardH, 'Time Entries', String(filteredEntries.length), [124, 58, 237]);
    drawKpiCard(margin + ((cardW + cardGap) * 2), cardY, cardW, cardH, 'Projects Covered', String(Object.keys(projectHours).length), [217, 119, 6]);

    let cursorY = cardY + cardH + 8;
    if (topProjects.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Top Projects by Hours', margin, cursorY);
        doc.autoTable({
            startY: cursorY + 3,
            head: [['Project', 'Hours']],
            body: topProjects.map(([project, hours]) => [project, hours.toFixed(2)]),
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            styles: { font: 'helvetica', fontSize: 9, textColor: [15, 23, 42] },
            columnStyles: { 1: { halign: 'right' } },
            margin: { left: margin, right: margin }
        });
        cursorY = doc.lastAutoTable.finalY + 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Time Log Details', margin, cursorY);
    if (filteredEntries.length > 0) {
        doc.autoTable({
            startY: cursorY + 3,
            head: [['Date', 'Project', 'Description', 'Hours']],
            body: filteredEntries.map((e) => [
                e.date || '-',
                e.project || '-',
                e.description || '-',
                (Number(e.hours) || 0).toFixed(2)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
            styles: { font: 'helvetica', fontSize: 8.7, textColor: [15, 23, 42], cellPadding: 2.1 },
            columnStyles: { 2: { cellWidth: 90 }, 3: { halign: 'right' } },
            margin: { left: margin, right: margin }
        });
        cursorY = doc.lastAutoTable.finalY + 8;
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('No time entries available for this reporting period.', margin, cursorY + 6);
        cursorY += 12;
    }

    const completedTasksWithReports = filteredTasks.filter((t) => t.status === 'Completed' && t.completionReport);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Completed Tasks and Delivery Notes', margin, cursorY);

    if (completedTasksWithReports.length > 0) {
        const tasksBody = completedTasksWithReports.map((t) => {
            const report = t.completionReport || {};
            const notes = [];
            const normalizeLabel = (label) => {
                const raw = String(label || '').trim();
                const lower = raw.toLowerCase();
                if (lower.includes('github') || lower.includes('git') || lower.includes('repo') || lower.includes('link') || lower.includes('url')) return 'GitHub Link';
                if (lower.includes('blocker')) return 'Blockers';
                if (lower.includes('tomorrow') || lower.includes('next') || lower.includes('plan')) return "Tomorrow's Plan";
                return raw || 'Notes';
            };
            const pushNote = (label, value) => {
                const cleanLabel = String(label || '').trim();
                const cleanValue = String(value || '').trim();
                if (!cleanValue) return;
                const canon = (txt) => txt.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
                if (canon(cleanValue) === canon(cleanLabel)) return;
                notes.push(cleanLabel + '\n' + cleanValue);
            };

            if (report.dynamicNotes) {
                const orderedLabels = ["Today's Output", 'Blockers', "Tomorrow's Plan", 'GitHub Link'];
                const consumed = new Set();
                orderedLabels.forEach((label) => {
                    Object.keys(report.dynamicNotes).forEach((k) => {
                        if (normalizeLabel(k) === label && !consumed.has(k)) {
                            pushNote(label, report.dynamicNotes[k]);
                            consumed.add(k);
                        }
                    });
                });
                Object.keys(report.dynamicNotes).forEach((k) => {
                    if (!consumed.has(k)) pushNote(normalizeLabel(k), report.dynamicNotes[k]);
                });
            } else {
                pushNote("Today's Output", report.output);
                pushNote('Blockers', report.blockers);
                pushNote("Tomorrow's Plan", report.tomorrow);
                pushNote('GitHub Link', report.link);
            }
            return [
                t.dateCompleted || '-',
                t.project || '-',
                t.name || '-',
                notes.join('\n\n--------------------\n\n') || 'No additional notes'
            ];
        });

        doc.autoTable({
            startY: cursorY + 3,
            head: [['Date', 'Project', 'Task', 'Delivery Notes']],
            body: tasksBody,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
            styles: { font: 'helvetica', fontSize: 8.5, textColor: [15, 23, 42], cellPadding: 2.1, valign: 'top' },
            columnStyles: { 3: { cellWidth: 88 } },
            margin: { left: margin, right: margin }
        });
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('No completed task notes found for this reporting period.', margin, cursorY + 6);
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i);
    }

    const filename = 'professional_report_' + type + '_' + today + '.pdf';
    doc.save(filename);
    showToast('Professional ' + type + ' report downloaded.');
};



