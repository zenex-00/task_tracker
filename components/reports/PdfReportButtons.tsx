'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { generateReport } from '@/lib/pdf/generateReport';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase/client';
import type { ReportType } from '@/types';
import { Modal } from '@/components/ui/Modal';

const cards: Array<{ type: ReportType; title: string; desc: string; cls: string }> = [
  { type: 'daily', title: 'Daily Report', desc: 'Today entries and notes', cls: 'rc-day' },
  { type: 'weekly', title: 'Weekly Summary', desc: 'Last 7 days overview', cls: 'rc-week' },
  { type: 'monthly', title: 'Monthly Analysis', desc: 'Current month summary', cls: 'rc-month' },
];

export function PdfReportButtons() {
  const tasks = useAppStore((s) => s.tasks);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ type: ReportType; url: string; fileName: string } | null>(null);
  const [profileName, setProfileName] = useState<string>('Team Member');

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    const loadName = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .maybeSingle<{ first_name: string; last_name: string }>();
      if (cancelled) return;
      const fullName = `${data?.first_name || ''} ${data?.last_name || ''}`.trim();
      if (fullName) setProfileName(fullName);
    };
    void loadName();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const closePreview = () => {
    setPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const downloadBlob = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const viewReport = async (type: ReportType) => {
    const key = `${type}-view`;
    try {
      setLoadingKey(key);
      const { blob, fileName } = await generateReport(type, timeEntries, tasks, {
        clientName: profileName,
        preparedBy: profileName,
      });
      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { type, url, fileName };
      });
    } catch (err) {
      console.error(err);
      toast('Unable to open PDF preview.');
    } finally {
      setLoadingKey(null);
    }
  };

  const downloadReport = async (type: ReportType) => {
    const key = `${type}-download`;
    try {
      setLoadingKey(key);
      const { blob, fileName } = await generateReport(type, timeEntries, tasks, {
        clientName: profileName,
        preparedBy: profileName,
      });
      const url = URL.createObjectURL(blob);
      downloadBlob(url, fileName);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Professional ${type} report downloaded.`);
    } catch (err) {
      console.error(err);
      toast('PDF generation failed.');
    } finally {
      setLoadingKey(null);
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
          <div key={card.type} className="report-card">
            <div className={`rc-icon ${card.cls}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="rc-text">
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
            <div className="report-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => viewReport(card.type)}
                disabled={loadingKey === `${card.type}-view` || loadingKey === `${card.type}-download`}
              >
                {loadingKey === `${card.type}-view` ? 'Loading...' : 'View'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => downloadReport(card.type)}
                disabled={loadingKey === `${card.type}-view` || loadingKey === `${card.type}-download`}
              >
                {loadingKey === `${card.type}-download` ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={Boolean(preview)}
        onClose={closePreview}
        title={preview ? `${cards.find((c) => c.type === preview.type)?.title ?? 'Report'} Preview` : 'Report Preview'}
        fullScreen
      >
        {preview ? (
          <div className="report-preview-wrap">
            <iframe src={preview.url} title="Report preview" className="report-preview-frame" />
            <div className="report-preview-actions">
              <button type="button" className="btn-primary" onClick={() => downloadBlob(preview.url, preview.fileName)}>
                Download PDF
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
