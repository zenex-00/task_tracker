'use client';

import { NoteIcon } from '@/components/ui/NoteIcon';
import type { NoteField } from '@/types';

interface NoteFieldsSectionProps {
  noteFields: NoteField[];
  onManage: () => void;
}

export function NoteFieldsSection({ noteFields, onManage }: NoteFieldsSectionProps) {
  return (
    <div className="notes-section mt-4">
      <div className="section-subhead">
        <h3>Daily Notes</h3>
        <button type="button" className="btn-ghost" onClick={onManage}>
          Edit
        </button>
      </div>

      {noteFields.map((nf, idx) => {
        const isLink = nf.name.toLowerCase().includes('link');
        return (
          <div key={`${nf.name}-${idx}`} className="form-group">
            <label htmlFor={`nf-${idx}`} style={{ color: nf.color || 'var(--text-primary)' }}>
              <NoteIcon iconKey={nf.icon} label={nf.name} />
              {nf.name} {nf.required ? '*' : ''}
            </label>
            {isLink ? (
              <input id={`nf-${idx}`} type="url" placeholder={nf.placeholder || ''} required={nf.required} />
            ) : (
              <textarea id={`nf-${idx}`} rows={2} placeholder={nf.placeholder || ''} required={nf.required} />
            )}
          </div>
        );
      })}
    </div>
  );
}