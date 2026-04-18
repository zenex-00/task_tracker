import { NOTE_ICON_MAP, normalizeNoteIcon } from '@/lib/utils/noteIcons';

interface NoteIconProps {
  iconKey: string;
  label?: string;
}

export function NoteIcon({ iconKey, label }: NoteIconProps) {
  const key = normalizeNoteIcon(iconKey, label);
  const markup = NOTE_ICON_MAP[key] || NOTE_ICON_MAP.note;

  return <span className="note-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}