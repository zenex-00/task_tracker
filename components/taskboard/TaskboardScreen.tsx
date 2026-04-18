'use client';

import { useMemo, useState } from 'react';

import { TaskCompletionForm } from '@/components/taskboard/TaskCompletionForm';
import { ManageProjectsModal } from '@/components/modals/ManageProjectsModal';
import { ManageHourTypesModal } from '@/components/modals/ManageHourTypesModal';
import { ManageNoteFieldsModal } from '@/components/modals/ManageNoteFieldsModal';

export function TaskboardScreen() {
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [hourTypesOpen, setHourTypesOpen] = useState(false);
  const [noteFieldsOpen, setNoteFieldsOpen] = useState(false);

  const sectionHeader = useMemo(
    () => (
      <div className="section-header">
        <div>
          <h2 className="section-title">Task Board</h2>
          <p className="section-subtitle">Submit daily completion reports by project.</p>
        </div>
      </div>
    ),
    [],
  );

  return (
    <section id="view-taskboard" className="view active">
      {sectionHeader}
      <div className="dashboard-grid">
        <div className="card mini-kpi">
          <h2>
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h18" />
                <path d="M5 7V5a2 2 0 0 1 2-2h3" />
                <path d="M19 7v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" />
              </svg>
            </span>
            Manage Projects
          </h2>
          <button type="button" className="btn-secondary w-full" onClick={() => setProjectsOpen(true)}>
            Edit Projects
          </button>
        </div>

        <div className="card">
          <h2>
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Complete a Task
          </h2>
          <TaskCompletionForm onManageHourTypes={() => setHourTypesOpen(true)} onManageNoteFields={() => setNoteFieldsOpen(true)} />
        </div>
      </div>

      <ManageProjectsModal isOpen={projectsOpen} onClose={() => setProjectsOpen(false)} />
      <ManageHourTypesModal isOpen={hourTypesOpen} onClose={() => setHourTypesOpen(false)} />
      <ManageNoteFieldsModal isOpen={noteFieldsOpen} onClose={() => setNoteFieldsOpen(false)} />
    </section>
  );
}
