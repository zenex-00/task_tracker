'use client';

import { useAppStore } from '@/lib/store/useAppStore';

export function SyncDot() {
  const syncStatus = useAppStore((s) => s.syncStatus);
  const className = syncStatus === 'ok' ? 'sync-ok' : syncStatus === 'error' ? 'sync-error' : 'sync-loading';
  const title = syncStatus === 'ok' ? 'Synced to cloud' : syncStatus === 'error' ? 'Sync error - check connection' : 'Syncing...';

  return <span className={`sync-dot ${className}`} title={title} aria-label={title} />;
}