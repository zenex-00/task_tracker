'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCharts } from '@/hooks/useCharts';

const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export function ProjectBreakdownList() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const { breakdownProjects } = useCharts(timeEntries);
  const total = breakdownProjects.reduce((sum, item) => sum + item.hours, 0);

  return (
    <div className="card">
      <h2>
        <span className="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
        Project Hours Breakdown
      </h2>

      {breakdownProjects.length === 0 ? (
        <EmptyState title="No project data yet" />
      ) : (
        <div>
          {breakdownProjects.map((item, idx) => {
            const pct = total > 0 ? ((item.hours / total) * 100).toFixed(1) : '0.0';
            return (
              <div className="project-row" key={item.name}>
                <div className="project-dot" style={{ background: colors[idx % colors.length] }} />
                <span className="project-name">{item.name}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{pct}%</span>
                <span className="project-hours">{item.hours.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}