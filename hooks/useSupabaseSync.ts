import { useAppStore } from '@/lib/store/useAppStore';
import type { TimeEntry } from '@/types';

export function useSupabaseSync() {
  const upsertTask = useAppStore((s) => s.upsertTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const upsertEntry = useAppStore((s) => s.upsertEntry);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);

  const removeEntry = (entryId: string) => {
    const entries = useAppStore.getState().timeEntries.filter((e: TimeEntry) => e.id !== entryId);
    useAppStore.setState({ timeEntries: entries });
    setSyncStatus('ok');
  };

  return {
    upsertTask,
    deleteTask,
    upsertEntry,
    removeEntry,
  };
}