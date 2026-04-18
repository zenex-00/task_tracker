'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { generateReport } from '@/lib/pdf/generateReport';
import { useAppStore } from '@/lib/store/useAppStore';
import type { ReportType } from '@/types';

const cards: Array<{ type: ReportType; title: string; desc: string; cls: string }> = [
  { type: 'daily', title: 'Daily Report', desc: 'Today entries and notes', cls: 'rc-day' },
  { type: 'weekly', title: 'Weekly Summary', desc: 'Last 7 days overview', cls: 'rc-week' },
  { type: 'monthly', title: 'Monthly Analysis', desc: 'Current month summary', cls: 'rc-month' },
];

export function PdfReportButtons() {
  const tasks = useAppStore((s) => s.tasks);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const [loading, setLoading] = useState<ReportType | null>(null);

  const run = async (type: ReportType) => {
    try {
      setLoading(type);
      await generateReport(type, timeEntries, tasks);
      toast(`Professional ${type} report downloaded.`);
    } catch (err) {
      console.error(err);
      toast('PDF generation failed.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card">
      <h2>
        <span className="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
        Generate PDF
      </h2>
      <p className="text-muted mb-4">Export report snapshots for daily, weekly, or monthly periods.</p>

      <div className="report-btn-group">
        {cards.map((card) => (
          <button key={card.type} className="report-card" onClick={() => run(card.type)} disabled={loading === card.type}>
            <div className={`rc-icon ${card.cls}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="rc-text">
              <h3>{card.title}</h3>
              <p>{loading === card.type ? 'Generating...' : card.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}