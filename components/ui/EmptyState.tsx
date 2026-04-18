import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  icon?: ReactNode;
}

export function EmptyState({ title, icon }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}
      </span>
      <p>{title}</p>
    </div>
  );
}