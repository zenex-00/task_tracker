import { useMemo } from 'react';

import { getMonthPrefix, getWeekAgoStr } from '@/lib/utils/date';
import type { TimeEntry } from '@/types';

export function useCharts(timeEntries: TimeEntry[]) {
  return useMemo(() => {
    const weekAgo = getWeekAgoStr();
    const monthPrefix = getMonthPrefix();

    const weekHours = timeEntries
      .filter((entry) => entry.date >= weekAgo)
      .reduce((sum, entry) => sum + entry.hours, 0);

    const monthProjects = new Set(
      timeEntries.filter((entry) => entry.date.startsWith(monthPrefix)).map((entry) => entry.project).filter(Boolean),
    ).size;

    const avgHoursPerEntry =
      timeEntries.length > 0 ? timeEntries.reduce((sum, entry) => sum + entry.hours, 0) / timeEntries.length : 0;

    const productivity = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const hours = timeEntries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.hours, 0);
      return { label, hours, date };
    });

    const projectMap = timeEntries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.project || 'General';
      acc[key] = (acc[key] || 0) + entry.hours;
      return acc;
    }, {});

    const sortedProjects = Object.entries(projectMap)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours);

    const topProjects = sortedProjects.slice(0, 5);
    const breakdownProjects = sortedProjects.slice(0, 6);
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

    return {
      weekHours,
      monthProjects,
      avgHoursPerEntry,
      productivity,
      topProjects,
      breakdownProjects,
      totalHours,
    };
  }, [timeEntries]);
}