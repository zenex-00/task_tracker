'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { generateReport } from '@/lib/pdf/generateReport';
import type { ReportType, Task, TimeEntry } from '@/types';

type SubmittedAttachment = {
  key: string;
  name: string;
  url: string;
  project: string;
  completedDate: string;
  taskName: string;
  fieldName?: string;
  size?: number;
};

type Props = {
  tasks: Task[];
  timeEntries: TimeEntry[];
  attachments: SubmittedAttachment[];
};

const cards: Array<{ type: ReportType; title: string; desc: string; cls: string }> = [
  { type: 'daily', title: 'Daily Report', desc: 'Today entries and notes', cls: 'rc-day' },
  { type: 'weekly', title: 'Weekly Summary', desc: 'Last 7 days overview', cls: 'rc-week' },
  { type: 'monthly', title: 'Monthly Analysis', desc: 'Current month summary', cls: 'rc-month' },
];

function formatFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function AdminUserSubmittedReports({ tasks, timeEntries, attachments }: Props) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ type: ReportType; url: string; fileName: string } | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const groupedAttachments = useMemo(() => {
    const groups = new Map<string, { key: string; project: string; completedDate: string; items: SubmittedAttachment[] }>();
    [...attachments]
      .sort((a, b) => b.completedDate.localeCompare(a.completedDate))
      .forEach((attachment) => {
        const key = `${attachment.project}::${attachment.completedDate}`;
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            project: attachment.project,
            completedDate: attachment.completedDate,
            items: [],
          });
        }
        groups.get(key)?.items.push(attachment);
      });
    return Array.from(groups.values());
  }, [attachments]);

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
      const { blob, fileName } = await generateReport(type, timeEntries, tasks);
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
      const { blob, fileName } = await generateReport(type, timeEntries, tasks);
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
    <div className="progress-reports">
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

      <div className="progress-attachments">
        <strong>Submitted Files</strong>
        {groupedAttachments.length ? (
          <div className="report-file-groups">
            {groupedAttachments.map((group) => (
              <section key={group.key} className="report-file-group">
                <h4 className="report-file-group-title">
                  {group.project} | {group.completedDate}
                </h4>
                <ul className="report-file-list">
                  {group.items.map((attachment) => (
                    <li key={attachment.key} className="report-file-item">
                      <div className="report-file-meta">
                        <div className="report-file-text">
                          <h4>{attachment.name}</h4>
                          <p>
                            {attachment.taskName}
                            {attachment.fieldName ? ` | ${attachment.fieldName}` : ''} | {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <div className="report-file-actions">
                        <a href={attachment.url} target="_blank" rel="noreferrer" className="report-file-btn report-file-btn-view">
                          View
                        </a>
                        <a href={attachment.url} download={attachment.name} className="report-file-btn report-file-btn-download">
                          Download
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-muted">No submitted files found.</p>
        )}
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
