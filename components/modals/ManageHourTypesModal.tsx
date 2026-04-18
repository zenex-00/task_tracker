'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/lib/store/useAppStore';
import type { HourType } from '@/types';

interface ManageHourTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageHourTypesModal({ isOpen, onClose }: ManageHourTypesModalProps) {
  const hourTypes = useAppStore((s) => s.hourTypes);
  const addHourType = useAppStore((s) => s.addHourType);
  const removeHourType = useAppStore((s) => s.removeHourType);
  const updateHourTypes = useAppStore((s) => s.updateHourTypes);

  const [draft, setDraft] = useState<HourType[]>(hourTypes);
  const [newHourType, setNewHourType] = useState<HourType>({ code: '', name: '', maxPercent: '', color: '#4f46e5' });

  useEffect(() => {
    setDraft(hourTypes);
  }, [hourTypes, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Hour Types" wide>
      <div className="projects-list">
        {draft.map((ht, idx) => (
          <div key={`${ht.code}-${idx}`} className="project-manage-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className="ht-code-input"
              value={ht.code}
              maxLength={4}
              onChange={(e) => {
                const next = [...draft];
                next[idx] = { ...ht, code: e.target.value.toUpperCase() };
                setDraft(next);
              }}
              placeholder="Code"
            />
            <input
              type="text"
              className="ht-name-input"
              value={ht.name}
              onChange={(e) => {
                const next = [...draft];
                next[idx] = { ...ht, name: e.target.value };
                setDraft(next);
              }}
              placeholder="Name"
            />
            <input
              type="color"
              className="ht-color-input"
              value={ht.color}
              onChange={(e) => {
                const next = [...draft];
                next[idx] = { ...ht, color: e.target.value };
                setDraft(next);
              }}
              style={{ width: 42, height: 42, padding: 2 }}
            />
            <button
              type="button"
              className="btn-remove-project"
              onClick={() => {
                removeHourType(idx);
                toast(`Hour type "${ht.code}" removed.`);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="modal-caption">Add New</div>
      <div className="add-project-row hour-add-row">
        <input
          type="text"
          value={newHourType.code}
          maxLength={4}
          placeholder="Code"
          onChange={(e) => setNewHourType((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
        />
        <input
          type="text"
          value={newHourType.name}
          placeholder="Name"
          onChange={(e) => setNewHourType((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input type="color" value={newHourType.color} onChange={(e) => setNewHourType((prev) => ({ ...prev, color: e.target.value }))} />
        <button
          type="button"
          className="btn-add-project"
          onClick={() => {
            if (!newHourType.code.trim() || !newHourType.name.trim()) {
              toast('Enter a code and name.');
              return;
            }
            addHourType(newHourType);
            setNewHourType({ code: '', name: '', maxPercent: '', color: '#4f46e5' });
            toast(`Hour type "${newHourType.code}" added.`);
          }}
        >
          Add
        </button>
      </div>

      <button
        type="button"
        className="btn-primary btn-large w-full mt-4"
        onClick={() => {
          updateHourTypes(draft);
          toast('Hour types saved.');
          onClose();
        }}
      >
        Save Changes
      </button>
    </Modal>
  );
}
