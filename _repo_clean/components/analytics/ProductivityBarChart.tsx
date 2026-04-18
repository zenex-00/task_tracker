'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { useAppStore } from '@/lib/store/useAppStore';
import { useCharts } from '@/hooks/useCharts';

export function ProductivityBarChart() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const { productivity } = useCharts(timeEntries);

  return (
    <div className="card analytics-full">
      <h2>
        <span className="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="19" />
            <polyline points="7 15 10 12 13 14 17 9" />
          </svg>
        </span>
        7-Day Productivity Trend
      </h2>

      <div className="chart-container chart-200">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={productivity}>
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="hours" fill="rgba(79, 70, 229, 0.12)" stroke="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}