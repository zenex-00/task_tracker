'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/lib/store/useAppStore';
import type { UploadField } from '@/types';

interface ManageUploadFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultField: UploadField = {
  name: '',
  placeholder: '',
  required: false,
  accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg',
};

export function ManageUploadFieldsModal({ isOpen, onClose }: ManageUploadFieldsModalProps) {
  const uploadFields = useAppStore((s) => s.uploadFields);
  const updateUploadFields = useAppStore((s) => s.updateUploadFields);

  const [draft, setDraft] = useState<UploadField[]>(uploadFields);
  const [newField, setNewField] = useState<UploadField>(defaultField);

  useEffect(() => {
    setDraft(uploadFields);
  }, [uploadFields, isOpen]);

  const patchDraftField = (idx: number, patch: Partial<UploadField>) => {
    const next = [...draft];
    next[idx] = { ...next[idx], ...patch };
    setDraft(next);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Upload Fields" wide>
      <div className="projects-list">
        {draft.map((field, idx) => (
          <div key={`${field.name}-${idx}`} className="project-manage-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <input type="text" value={field.name} onChange={(e) => patchDraftField(idx, { name: e.target.value })} placeholder="Section label" />
            <input
              type="text"
              value={field.placeholder}
              onChange={(e) => patchDraftField(idx, { placeholder: e.target.value })}
              placeholder="Helper text"
            />
            <input type="text" value={field.accept} onChange={(e) => patchDraftField(idx, { accept: e.target.value })} placeholder="Allowed types" />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={field.required} onChange={(e) => patchDraftField(idx, { required: e.target.checked })} />
              Req
            </label>
            <button
              type="button"
              className="btn-remove-project"
              onClick={() => {
                setDraft((prev) => prev.filter((_, i) => i !== idx));
                toast(`Upload field "${field.name || `#${idx + 1}`}" removed from draft.`);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="modal-caption">Add New Upload Field</div>
      <div className="add-project-row">
        <input type="text" value={newField.name} onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))} placeholder="Section label" />
        <input
          type="text"
          value={newField.placeholder}
          onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))}
          placeholder="Helper text"
        />
        <input
          type="text"
          value={newField.accept}
          onChange={(e) => setNewField((prev) => ({ ...prev, accept: e.target.value }))}
          placeholder="Allowed types"
        />
        <button
          type="button"
          className="btn-add-project"
          onClick={() => {
            if (!newField.name.trim()) {
              toast('Upload field label is required.');
              return;
            }
            setDraft((prev) => [...prev, {
              ...newField,
              name: newField.name.trim(),
              accept: newField.accept || defaultField.accept,
            }]);
            setNewField(defaultField);
            toast(`Upload field "${newField.name}" added to draft.`);
          }}
        >
          Add
        </button>
      </div>

      <button
        type="button"
        className="btn-primary btn-large w-full mt-4"
        onClick={() => {
          const filtered = draft.filter((field) => field.name.trim());
          if (!filtered.length) {
            toast('At least one upload field is required.');
            return;
          }
          updateUploadFields(filtered);
          toast('Upload fields saved.');
          onClose();
        }}
      >
        Save Changes
      </button>
    </Modal>
  );
}
