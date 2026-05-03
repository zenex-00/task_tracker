'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase/client';
import { CellProgressBar } from '@/components/ui/CellProgressBar';
import type { ReportAttachment } from '@/types';

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function CompletionReportsPanel() {
  const tasks = useAppStore((s) => s.tasks);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  const reports = useMemo(
    () =>
      tasks
        .filter((task) => task.completionReport)
        .sort((a, b) => new Date(b.dateCompleted || b.createdDate).getTime() - new Date(a.dateCompleted || a.createdDate).getTime()),
    [tasks],
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveUrls() {
      const allAttachments: ReportAttachment[] = reports.flatMap((task) => task.completionReport?.attachments || []);
      if (!allAttachments.length) {
        if (!cancelled) setAttachmentUrls({});
        return;
      }

      const resolvedPairs = await Promise.all(
        allAttachments.map(async (attachment) => {
          const key = `${attachment.bucket}/${attachment.path}`;
          const { data, error } = await supabase.storage.from(attachment.bucket).createSignedUrl(attachment.path, 60 * 60);
          if (error || !data?.signedUrl) {
            return [key, attachment.publicUrl || ''] as const;
          }
          return [key, data.signedUrl] as const;
        }),
      );

      if (!cancelled) {
        setAttachmentUrls(Object.fromEntries(resolvedPairs));
      }
    }

    void resolveUrls();
    return () => {
      cancelled = true;
    };
  }, [reports]);

  return (
    <section className="card full-span">
      <div className="section-header">
        <div>
          <h2 className="section-title">Submitted Reports</h2>
          <p className="section-subtitle">Your submitted notes and uploaded files.</p>
        </div>
      </div>

      {reports.length ? (
        <div className="progress-reports">
          {reports.map((task) => {
            const dynamicNotes = Object.entries(task.completionReport?.dynamicNotes || {});
            const attachments = task.completionReport?.attachments || [];
            const taskProgress = task.completionReport?.taskProgress ?? 0;
            const projectProgress = task.completionReport?.projectProgress ?? 0;
            return (
              <article key={task.id} className="progress-report-card">
                <h3>
                  {task.name} <span className="text-muted">({task.project || 'General'})</span>
                </h3>
                <p className="text-muted">Completed: {task.dateCompleted || '-'}</p>
                <div className="report-progress-strip">
                  <div>
                    <strong>Task Progress</strong>
                    <CellProgressBar ariaLabel={`Task progress for ${task.name}`} value={taskProgress} compact />
                  </div>
                  <div>
                    <strong>Project Progress</strong>
                    <CellProgressBar ariaLabel={`Project progress for ${task.project || 'General'}`} value={projectProgress} compact />
                  </div>
                </div>

                {dynamicNotes.length ? (
                  <div className="progress-notes">
                    {dynamicNotes.map(([label, value]) => (
                      <div key={label} className="progress-note-item">
                        <strong>{label}:</strong> {value || '-'}
                      </div>
                    ))}
                  </div>
                ) : null}

                {attachments.length ? (
                  <div className="progress-attachments">
                    <strong>Attachments</strong>
                    <ul className="report-file-list">
                      {attachments.map((attachment) => {
                        const key = `${attachment.bucket}/${attachment.path}`;
                        const url = attachmentUrls[key] || attachment.publicUrl || '';
                        return (
                          <li key={key} className="report-file-item">
                            <div className="report-file-meta">
                              <div className="report-file-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M6.75 3.75h8.5l4 4v12.5a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5v-15a1.5 1.5 0 0 1 1.5-1.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <path d="M15.25 3.75v4h4" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                              </div>
                              <div className="report-file-text">
                                <h4>Daily Report</h4>
                                <p>
                                  {attachment.name}
                                  {attachment.fieldName ? ` [${attachment.fieldName}]` : ''} ({formatFileSize(attachment.size)})
                                </p>
                              </div>
                            </div>
                            <div className="report-file-actions">
                              {url ? (
                                <>
                                  <a href={url} target="_blank" rel="noreferrer" className="report-file-btn report-file-btn-view">
                                    View
                                  </a>
                                  <a href={url} download={attachment.name} className="report-file-btn report-file-btn-download">
                                    Download
                                  </a>
                                </>
                              ) : (
                                <>
                                  <span className="report-file-btn report-file-btn-view is-disabled">View</span>
                                  <span className="report-file-btn report-file-btn-download is-disabled">Download</span>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-muted">No submitted reports yet.</p>
      )}
    </section>
  );
}
