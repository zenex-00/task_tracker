'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { NoteIcon } from '@/components/ui/NoteIcon';
import { useAppStore } from '@/lib/store/useAppStore';
import { normalizeNoteIcon } from '@/lib/utils/noteIcons';
import type { NoteField, NoteIconKey } from '@/types';

interface ManageNoteFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultField: NoteField = {
  icon: 'note',
  name: '',
  placeholder: '',
  required: false,
  color: 'var(--text-muted)',
};

export function ManageNoteFieldsModal({ isOpen, onClose }: ManageNoteFieldsModalProps) {
  const noteFields = useAppStore((s) => s.noteFields);
  const updateNoteFields = useAppStore((s) => s.updateNoteFields);

  const [draft, setDraft] = useState<NoteField[]>(noteFields);
  const [newField, setNewField] = useState<NoteField>(defaultField);

  useEffect(() => {
    setDraft(noteFields);
  }, [noteFields, isOpen]);

  const setDraftField = (idx: number, patch: Partial<NoteField>) => {
    const next = [...draft];
    next[idx] = { ...next[idx], ...patch };
    setDraft(next);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Note Fields" wide>
      <div className="projects-list">
        {draft.map((nf, idx) => (
          <div key={`${nf.name}-${idx}`} className="project-manage-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <span className="note-icon-preview">
              <NoteIcon iconKey={nf.icon} label={nf.name} />
            </span>
            <select value={nf.icon} onChange={(e) => setDraftField(idx, { icon: normalizeNoteIcon(e.target.value) })}>
              <option value="output">Output</option>
              <option value="blockers">Blockers</option>
              <option value="plan">Plan</option>
              <option value="link">Link</option>
              <option value="note">Note</option>
            </select>
            <input type="text" value={nf.name} onChange={(e) => setDraftField(idx, { name: e.target.value })} placeholder="Label" />
            <input type="text" value={nf.placeholder} onChange={(e) => setDraftField(idx, { placeholder: e.target.value })} placeholder="Placeholder" />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={nf.required} onChange={(e) => setDraftField(idx, { required: e.target.checked })} /> Req
            </label>
            <button
              type="button"
              className="btn-remove-project"
              onClick={() => {
                setDraft((prev) => prev.filter((_, i) => i !== idx));
                toast(`Field "${nf.name}" removed from draft.`);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="modal-caption">Add New Field</div>
      <div className="add-project-row note-add-row">
        <span className="note-icon note-icon-preview" aria-hidden="true">
          <NoteIcon iconKey={newField.icon} label={newField.name} />
        </span>
        <select value={newField.icon} onChange={(e) => setNewField((prev) => ({ ...prev, icon: normalizeNoteIcon(e.target.value) as NoteIconKey }))}>
          <option value="output">Output</option>
          <option value="blockers">Blockers</option>
          <option value="plan">Plan</option>
          <option value="link">Link</option>
          <option value="note">Note</option>
        </select>
        <input type="text" value={newField.name} onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))} placeholder="Label" />
        <input
          type="text"
          value={newField.placeholder}
          onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))}
          placeholder="Placeholder"
        />
        <button
          type="button"
          className="btn-add-project"
          onClick={() => {
            if (!newField.name.trim()) {
              toast('Label is required.');
              return;
            }
            setDraft((prev) => [...prev, newField]);
            setNewField(defaultField);
            toast(`Field "${newField.name}" added to draft.`);
          }}
        >
          Add
        </button>
      </div>

      <button
        type="button"
        className="btn-primary btn-large w-full mt-4"
        onClick={() => {
          updateNoteFields(draft);
          toast('Note fields saved.');
          onClose();
        }}
      >
        Save Changes
      </button>
    </Modal>
  );
}
