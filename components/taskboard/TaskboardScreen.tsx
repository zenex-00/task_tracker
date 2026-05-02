'use client';

import { useMemo, useState } from 'react';

import { TaskCompletionForm } from '@/components/taskboard/TaskCompletionForm';
import { ManageHourTypesModal } from '@/components/modals/ManageHourTypesModal';
import { ManageNoteFieldsModal } from '@/components/modals/ManageNoteFieldsModal';
import { ManageUploadFieldsModal } from '@/components/modals/ManageUploadFieldsModal';

export function TaskboardScreen() {
  const [hourTypesOpen, setHourTypesOpen] = useState(false);
  const [noteFieldsOpen, setNoteFieldsOpen] = useState(false);
  const [uploadFieldsOpen, setUploadFieldsOpen] = useState(false);

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
        <div className="card">
          <h2>
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Complete a Task
          </h2>
          <TaskCompletionForm
            onManageHourTypes={() => setHourTypesOpen(true)}
            onManageNoteFields={() => setNoteFieldsOpen(true)}
            onManageUploadFields={() => setUploadFieldsOpen(true)}
          />
        </div>
      </div>

      <ManageHourTypesModal isOpen={hourTypesOpen} onClose={() => setHourTypesOpen(false)} />
      <ManageNoteFieldsModal isOpen={noteFieldsOpen} onClose={() => setNoteFieldsOpen(false)} />
      <ManageUploadFieldsModal isOpen={uploadFieldsOpen} onClose={() => setUploadFieldsOpen(false)} />
    </section>
  );
}
