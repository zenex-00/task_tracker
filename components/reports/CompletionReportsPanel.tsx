'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase/client';
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
            return (
              <article key={task.id} className="progress-report-card">
                <h3>
                  {task.name} <span className="text-muted">({task.project || 'General'})</span>
                </h3>
                <p className="text-muted">Completed: {task.dateCompleted || '-'}</p>

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
                    <ul>
                      {attachments.map((attachment) => {
                        const key = `${attachment.bucket}/${attachment.path}`;
                        const url = attachmentUrls[key] || attachment.publicUrl || '';
                        return (
                          <li key={key}>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer">
                                {attachment.name}
                              </a>
                            ) : (
                              <span>{attachment.name}</span>
                            )}{' '}
                            {attachment.fieldName ? <span className="text-muted">[{attachment.fieldName}]</span> : null}{' '}
                            <span className="text-muted">({formatFileSize(attachment.size)})</span>
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

