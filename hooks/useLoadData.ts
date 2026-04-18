import { useEffect } from 'react';

import { getLocalFallbackData, useAppStore } from '@/lib/store/useAppStore';

export function useLoadData(): void {
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);
  const setLocalFallback = useAppStore((s) => s.setLocalFallback);
  const loadAllData = useAppStore((s) => s.loadAllData);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setSyncStatus('loading');
      const fallback = getLocalFallbackData();
      if (mounted) {
        setLocalFallback(fallback);
      }
      const ok = await loadAllData();
      if (!ok && mounted) {
        setSyncStatus('error');
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [setSyncStatus, setLocalFallback, loadAllData]);
}