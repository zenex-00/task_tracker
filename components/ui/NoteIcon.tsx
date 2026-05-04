import { NOTE_ICON_MAP, normalizeNoteIcon } from '@/lib/utils/noteIcons';

interface NoteIconProps {
  iconKey: string;
  label?: string;
}

export function NoteIcon({ iconKey, label }: NoteIconProps) {
  const key = normalizeNoteIcon(iconKey, label);
  if (!NOTE_ICON_MAP[key]) {
    return null;
  }
  return (
    <span className="note-icon" aria-hidden="true">
      {key === 'output' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
      {key === 'blockers' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.3 3.6L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>
      ) : null}
      {key === 'plan' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M3 12h12" />
          <path d="M3 18h9" />
          <path d="M17 17l2 2 4-4" />
        </svg>
      ) : null}
      {key === 'link' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10 5" />
          <path d="M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 1 0 7.1 7.1L14 19" />
        </svg>
      ) : null}
      {key === 'note' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      ) : null}
    </span>
  );
}
