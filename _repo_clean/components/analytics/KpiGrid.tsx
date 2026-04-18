'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { useCharts } from '@/hooks/useCharts';

export function KpiGrid() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const { weekHours, monthProjects, avgHoursPerEntry } = useCharts(timeEntries);

  return (
    <div className="card">
      <h2>
        <span className="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
          </svg>
        </span>
        Key Performance Indicators
      </h2>

      <div className="kpi-grid">
        <div className="kpi-item">
          <span className="kpi-value">{weekHours.toFixed(1)}h</span>
          <span className="kpi-label">Hours This Week</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-value">{monthProjects}</span>
          <span className="kpi-label">Projects This Month</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-value">{avgHoursPerEntry.toFixed(1)}h</span>
          <span className="kpi-label">Avg Hours/Entry</span>
        </div>
      </div>
    </div>
  );
}