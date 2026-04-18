'use client';

import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { useAppStore } from '@/lib/store/useAppStore';
import { EmptyState } from '@/components/ui/EmptyState';

const palette = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export function ProjectsDonutChart() {
  const timeEntries = useAppStore((s) => s.timeEntries);

  const data = useMemo(() => {
    const map = timeEntries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.project || 'General';
      acc[key] = (acc[key] || 0) + entry.hours;
      return acc;
    }, {});

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [timeEntries]);

  return (
    <div className="card">
      <h2>
        <span className="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <rect x="7" y="12" width="3" height="6" />
            <rect x="12" y="9" width="3" height="9" />
            <rect x="17" y="6" width="3" height="12" />
          </svg>
        </span>
        Top Projects by Time
      </h2>

      <div className="chart-container chart-260">
        {data.length === 0 ? (
          <EmptyState title="No Data" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={palette[idx % palette.length]} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}