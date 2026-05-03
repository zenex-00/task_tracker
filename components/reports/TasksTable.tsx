'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/lib/store/useAppStore';

export function TasksTable() {
  const tasks = useAppStore((s) => s.tasks);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => {
    let list = [...tasks].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    const term = search.toLowerCase().trim();
    if (term) {
      list = list.filter((task) => task.name.toLowerCase().includes(term) || task.project.toLowerCase().includes(term));
    }
    if (status !== 'All') {
      list = list.filter((task) => task.status === status);
    }
    return list;
  }, [tasks, search, status]);

  return (
    <div className="card full-span">
      <div className="table-header">
        <h2>
          <span className="card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="14" x2="8" y2="14" />
              <line x1="12" y1="14" x2="16" y2="14" />
            </svg>
          </span>
          All Tasks
        </h2>

        <div className="filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {filtered.length === 0 ? (
          <EmptyState title="No tasks found - add tasks in the Task Board." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Task</th>
                <th>Project</th>
                <th>Hours</th>
                <th>Date + Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Badge status={task.status} />
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{task.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{task.project}</td>
                  <td>
                    <strong>{task.hoursSpent.toFixed(2)}h</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{task.createdDate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
