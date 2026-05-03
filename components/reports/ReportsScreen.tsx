'use client';

import { PdfReportButtons } from '@/components/reports/PdfReportButtons';
import { ProjectsDonutChart } from '@/components/reports/ProjectsDonutChart';
import { TasksTable } from '@/components/reports/TasksTable';

export function ReportsScreen() {
  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Reports</h2>
          <p className="section-subtitle">Generate PDF reports and explore task history.</p>
        </div>
      </div>

      <div className="dashboard-grid reports-grid">
        <PdfReportButtons />
        <ProjectsDonutChart />
        <TasksTable />
      </div>
    </section>
  );
}
