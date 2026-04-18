'use client';

import type { CSSProperties } from 'react';
import { toast } from 'sonner';

import { KpiGrid } from '@/components/analytics/KpiGrid';
import { ProductivityBarChart } from '@/components/analytics/ProductivityBarChart';
import { ProjectBreakdownList } from '@/components/analytics/ProjectBreakdownList';
import { useAppStore } from '@/lib/store/useAppStore';

export function AnalyticsScreen() {
  const totalHours = useAppStore((s) => s.timeEntries.reduce((sum, entry) => sum + entry.hours, 0));
  const metricStyle = { '--metric-color': '#2f5ef6' } as CSSProperties;

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Analytics</h2>
          <p className="section-subtitle">Review performance and project distribution.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => toast('Analytics refreshed.')}>
          Refresh
        </button>
      </div>

      <div className="metric-row" id="analytics-metrics">
        <div className="metric-card" style={metricStyle}>
          <span className="mc-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 16 14" />
            </svg>
          </span>
          <span className="mc-value">{totalHours.toFixed(1)}h</span>
          <span className="mc-label">Total Hours Logged</span>
        </div>
      </div>

      <div className="analytics-grid">
        <ProductivityBarChart />
        <KpiGrid />
        <ProjectBreakdownList />
      </div>
    </section>
  );
}
