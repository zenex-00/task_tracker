'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store/useAppStore';

export function AdminProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const updateProjects = useAppStore((s) => s.updateProjects);

  const [newProject, setNewProject] = useState('');
  const [draft, setDraft] = useState<string[]>(projects);

  useEffect(() => {
    setDraft(projects);
  }, [projects]);

  const onAdd = () => {
    const val = newProject.trim();
    if (!val) {
      toast('Enter a project name first.');
      return;
    }
    setDraft((prev) => {
      if (prev.includes(val)) {
        toast(`Project "${val}" already exists.`);
        return prev;
      }
      return [...prev, val];
    });
    setNewProject('');
    toast(`Project "${val}" added to draft.`);
  };

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Projects</h2>
          <p className="section-subtitle">Create and manage projects available to team task boards.</p>
        </div>
      </div>

      <section className="card full-span">
        <div id="projects-list-container" className="projects-list">
          {draft.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '1rem 0' }}>No projects yet. Add one below.</p>
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
                    setDraft((prev) => prev.filter((_, i) => i !== idx));
                    toast(`Project "${project}" removed from draft.`);
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
              onAdd();
            }}
          />
          <button type="button" className="btn-add-project" onClick={onAdd}>
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
          }}
        >
          Save Changes
        </button>
      </section>
    </section>
  );
}
