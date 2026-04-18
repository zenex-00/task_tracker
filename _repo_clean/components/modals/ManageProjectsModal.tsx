'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/lib/store/useAppStore';

interface ManageProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageProjectsModal({ isOpen, onClose }: ManageProjectsModalProps) {
  const projects = useAppStore((s) => s.projects);
  const addProject = useAppStore((s) => s.addProject);
  const removeProject = useAppStore((s) => s.removeProject);
  const updateProjects = useAppStore((s) => s.updateProjects);

  const [newProject, setNewProject] = useState('');
  const [draft, setDraft] = useState<string[]>(projects);

  useEffect(() => {
    setDraft(projects);
  }, [projects, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Projects">
      <div id="projects-list-container" className="projects-list">
        {draft.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '1rem 0' }}>No projects yet. Add one below!</p>
        ) : (
          draft.map((project, idx) => (
            <div key={`${project}-${idx}`} className="project-manage-row">
              <input
                type="text"
                className="project-name-input"
                value={project}
                onChange={(e) => {
                  const next = [...draft];
                  next[idx] = e.target.value;
                  setDraft(next);
                }}
                placeholder="Project name"
              />
              <button
                className="btn-remove-project"
                onClick={() => {
                  removeProject(idx);
                  toast(`Project "${project}" removed.`);
                }}
                type="button"
                title="Remove project"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>

      <div className="add-project-row">
        <input
          type="text"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          placeholder="New project name"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const val = newProject.trim();
            if (!val) {
              toast('Enter a project name first.');
              return;
            }
            addProject(val);
            setNewProject('');
            toast(`Project "${val}" added.`);
          }}
        />
        <button
          type="button"
          className="btn-add-project"
          onClick={() => {
            const val = newProject.trim();
            if (!val) {
              toast('Enter a project name first.');
              return;
            }
            addProject(val);
            setNewProject('');
            toast(`Project "${val}" added.`);
          }}
        >
          Add
        </button>
      </div>

      <button
        type="button"
        className="btn-primary btn-large w-full mt-4"
        onClick={() => {
          const clean = draft.map((item) => item.trim()).filter(Boolean);
          updateProjects(clean);
          toast('Projects saved.');
          onClose();
        }}
      >
        Save Changes
      </button>
    </Modal>
  );
}
