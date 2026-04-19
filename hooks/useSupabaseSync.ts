import { useAppStore } from '@/lib/store/useAppStore';

export function useSupabaseSync() {
  const upsertTask = useAppStore((s) => s.upsertTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const upsertEntry = useAppStore((s) => s.upsertEntry);
  const deleteEntry = useAppStore((s) => s.deleteEntry);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);

  const removeEntry = (entryId: string) => {
    deleteEntry(entryId);
    setSyncStatus('loading');
  };

  return {
    upsertTask,
    deleteTask,
    upsertEntry,
    removeEntry,
  };
}
