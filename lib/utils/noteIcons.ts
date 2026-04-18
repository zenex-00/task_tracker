import type { NoteField, NoteIconKey } from '@/types';

export const NOTE_ICON_MAP: Record<NoteIconKey, string> = {
  output:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  blockers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12" y2="17"></line></svg>',
  plan:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M3 12h12"></path><path d="M3 18h9"></path><path d="M17 17l2 2 4-4"></path></svg>',
  link:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10 5"></path><path d="M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 1 0 7.1 7.1L14 19"></path></svg>',
  note:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>',
};

export function normalizeNoteIcon(iconValue: string, label = ''): NoteIconKey {
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
  return NOTE_ICON_MAP[v as NoteIconKey] ? (v as NoteIconKey) : 'note';
}

export function normalizeNoteFields(fields: NoteField[]): NoteField[] {
  return fields.map((nf) => ({ ...nf, icon: normalizeNoteIcon(nf.icon, nf.name) }));
}

export function noteIconMarkup(iconKey: string, label = ''): string {
  const key = normalizeNoteIcon(iconKey, label);
  return `<span class="note-icon" aria-hidden="true">${NOTE_ICON_MAP[key] || NOTE_ICON_MAP.note}</span>`;
}

export function noteIconOptionsMarkup(selectedKey = 'note'): string {
  const selected = normalizeNoteIcon(selectedKey);
  const options = [
    { value: 'output', label: 'Output' },
    { value: 'blockers', label: 'Blockers' },
    { value: 'plan', label: 'Plan' },
    { value: 'link', label: 'Link' },
    { value: 'note', label: 'Note' },
  ];

  return options
    .map((opt) => `<option value="${opt.value}" ${opt.value === selected ? 'selected' : ''}>${opt.label}</option>`)
    .join('');
}