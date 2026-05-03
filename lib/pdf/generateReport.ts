import type { ReportType, Task, TimeEntry } from '@/types';
import { getMonthPrefix, getTodayStr, getWeekAgoStr } from '@/lib/utils/date';

type JsPdfCtor = new (options: { unit: string; format: string }) => JsPdfDoc;

type AutoTableOptions = {
  startY: number;
  head: string[][];
  body: string[][];
  theme: 'striped' | 'grid';
  headStyles: Record<string, unknown>;
  styles: Record<string, unknown>;
  columnStyles?: Record<number, Record<string, unknown>>;
  margin: { left: number; right: number };
};

type JsPdfDoc = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  lastAutoTable: { finalY: number };
  setFillColor: (...args: number[]) => void;
  rect: (x: number, y: number, w: number, h: number, style: string) => void;
  setTextColor: (...args: number[]) => void;
  setFont: (font: string, style: string) => void;
  setFontSize: (size: number) => void;
  text: (text: string, x: number, y: number, options?: { align?: 'right' | 'left' | 'center' }) => void;
  setDrawColor: (...args: number[]) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style: string) => void;
  autoTable: (options: AutoTableOptions) => void;
  getNumberOfPages: () => number;
  setPage: (page: number) => void;
  save: (fileName: string) => void;
  output: (type: 'blob') => Blob;
};

export interface GeneratedReportPdf {
  blob: Blob;
  fileName: string;
}

function normalizeLabel(label: string): string {
  const raw = String(label || '').trim();
  const lower = raw.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  if (
    words.includes('github') ||
    words.includes('git') ||
    words.includes('repo') ||
    words.includes('repository') ||
    words.includes('link') ||
    words.includes('url')
  ) {
    return 'GitHub Link';
  }
  if (lower.includes('blocker')) return 'Blockers';
  if (lower.includes('tomorrow') || lower.includes('next') || lower.includes('plan')) return "Tomorrow's Plan";
  return raw || 'Notes';
}

function pushNote(notes: string[], label: string, value: string): void {
  const cleanLabel = String(label || '').trim();
  const cleanValue = String(value || '').trim();
  if (!cleanValue) return;
  const canon = (txt: string) => txt.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  if (canon(cleanValue) === canon(cleanLabel)) return;
  notes.push(`${cleanLabel}\n${cleanValue}`);
}

function renderCellProgress(value?: number): string {
  const bounded = Math.max(0, Math.min(100, Number(value) || 0));
  const active = Math.round(bounded / 10);
  return `[${'#'.repeat(active)}${'.'.repeat(10 - active)}]`;
}

export async function generateReport(type: ReportType, timeEntries: TimeEntry[], tasks: Task[]): Promise<GeneratedReportPdf> {
  const [jsPdfMod, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const jsPDF = (jsPdfMod as any).default || (jsPdfMod as any).jsPDF;

  const autoTable = (
    (autoTableMod as unknown as { default?: (doc: JsPdfDoc, opts: AutoTableOptions) => void; autoTable?: (doc: JsPdfDoc, opts: AutoTableOptions) => void })
      .default ||
    (autoTableMod as unknown as { autoTable?: (doc: JsPdfDoc, opts: AutoTableOptions) => void }).autoTable
  ) as (doc: JsPdfDoc, opts: AutoTableOptions) => void;
  const PdfCtor = jsPDF as unknown as JsPdfCtor;
  const doc = new PdfCtor({ unit: 'mm', format: 'a4' });
  doc.autoTable = (opts: AutoTableOptions) => autoTable(doc, opts);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const today = getTodayStr();
  const clientName = 'Monzer';
  const freelancerName = 'Abdul Rehman';

  let reportLabel = 'Performance Report';
  let periodLabel = 'All Time';
  let entriesFilter: (e: TimeEntry) => boolean = () => true;
  let tasksFilter: (t: Task) => boolean = () => true;

  if (type === 'daily') {
    reportLabel = 'Daily Activity Report';
    periodLabel = today;
    entriesFilter = (e) => e.date === today;
    tasksFilter = (t) => t.dateCompleted === today || t.createdDate === today;
  } else if (type === 'weekly') {
    const weekStr = getWeekAgoStr();
    reportLabel = 'Weekly Progress Report';
    periodLabel = `${weekStr} to ${today}`;
    entriesFilter = (e) => e.date >= weekStr && e.date <= today;
    tasksFilter = (t) =>
      Boolean(t.dateCompleted && t.dateCompleted >= weekStr && t.dateCompleted <= today) ||
      Boolean(t.createdDate && t.createdDate >= weekStr && t.createdDate <= today);
  } else if (type === 'monthly') {
    const monthPrefix = getMonthPrefix();
    reportLabel = 'Monthly Delivery Report';
    periodLabel = monthPrefix;
    entriesFilter = (e) => e.date.startsWith(monthPrefix);
    tasksFilter = (t) =>
      Boolean(t.dateCompleted && t.dateCompleted.startsWith(monthPrefix)) ||
      Boolean(t.createdDate && t.createdDate.startsWith(monthPrefix));
  }

  const filteredEntries = timeEntries.filter(entriesFilter);
  const filteredTasks = tasks.filter(tasksFilter);

  const totalHours = filteredEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  const projectHours = filteredEntries.reduce<Record<string, number>>((acc, e) => {
    const key = e.project || 'General';
    acc[key] = (acc[key] || 0) + (Number(e.hours) || 0);
    return acc;
  }, {});
  const topProjects = Object.entries(projectHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const drawHeader = () => {
    doc.setFillColor(16, 24, 40);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 34, pageWidth, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Professional Work Report', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(reportLabel, margin, 21);
    doc.text(`Period: ${periodLabel}`, margin, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 32);

    doc.setFont('helvetica', 'bold');
    doc.text(`Client: ${clientName}`, pageWidth - margin, 18, { align: 'right' });
    doc.text(`Prepared by: ${freelancerName}`, pageWidth - margin, 25, { align: 'right' });
  };

  const drawFooter = (pageNo: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Confidential | ${clientName} x ${freelancerName}`, margin, pageHeight - 5);
    doc.text(`Page ${pageNo}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  const drawKpiCard = (x: number, y: number, w: number, h: number, label: string, value: string, tint: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
    doc.setFillColor(tint[0], tint[1], tint[2]);
    doc.rect(x, y, 2.5, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), x + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x + 5, y + 14);
  };

  drawHeader();

  const cardY = 44;
  const cardGap = 4;
  const cardW = (pageWidth - margin * 2 - cardGap * 2) / 3;
  const cardH = 18;

  drawKpiCard(margin, cardY, cardW, cardH, 'Total Hours', totalHours.toFixed(2), [37, 99, 235]);
  drawKpiCard(margin + cardW + cardGap, cardY, cardW, cardH, 'Time Entries', String(filteredEntries.length), [124, 58, 237]);
  drawKpiCard(
    margin + (cardW + cardGap) * 2,
    cardY,
    cardW,
    cardH,
    'Projects Covered',
    String(Object.keys(projectHours).length),
    [217, 119, 6],
  );

  let cursorY = cardY + cardH + 8;

  if (topProjects.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Projects by Hours', margin, cursorY);
    doc.autoTable({
      startY: cursorY + 3,
      head: [['Project', 'Hours']],
      body: topProjects.map(([project, hours]) => [project, hours.toFixed(2)]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 9, textColor: [15, 23, 42] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  const taskProgressRows = filteredTasks
    .filter((task) => task.completionReport)
    .map((task) => ({
      project: task.project || '-',
      task: task.name || '-',
      cells: renderCellProgress(task.completionReport?.taskProgress),
    }));
  if (taskProgressRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Task Progress Snapshot', margin, cursorY);
    doc.autoTable({
      startY: cursorY + 3,
      head: [['Project', 'Task', 'Progress Cells']],
      body: taskProgressRows.map((row) => [row.project, row.task, row.cells]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 9, textColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  const latestProjectProgress = filteredTasks.reduce<Record<string, { createdDate: string; value: number }>>((acc, task) => {
    const key = task.project || 'General';
    const value = task.completionReport?.projectProgress;
    if (typeof value !== 'number') return acc;
    const marker = task.dateCompleted || task.createdDate || '';
    const current = acc[key];
    if (!current || marker >= current.createdDate) {
      acc[key] = { createdDate: marker, value };
    }
    return acc;
  }, {});
  const projectProgressRows = Object.entries(latestProjectProgress).map(([project, data]) => [project, renderCellProgress(data.value)]);
  if (projectProgressRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Project Progress Snapshot', margin, cursorY);
    doc.autoTable({
      startY: cursorY + 3,
      head: [['Project', 'Progress Cells']],
      body: projectProgressRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 9, textColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Time Log Details', margin, cursorY);

  if (filteredEntries.length > 0) {
    doc.autoTable({
      startY: cursorY + 3,
      head: [['Date', 'Project', 'Description', 'Hours']],
      body: filteredEntries.map((e) => [e.date || '-', e.project || '-', e.description || '-', (Number(e.hours) || 0).toFixed(2)]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 8.7, textColor: [15, 23, 42], cellPadding: 2.1 },
      columnStyles: { 2: { cellWidth: 90 }, 3: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No time entries available for this reporting period.', margin, cursorY + 6);
    cursorY += 12;
  }

  const completedTasksWithReports = filteredTasks.filter((t) => t.status === 'Completed' && t.completionReport);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Completed Tasks and Delivery Notes', margin, cursorY);

  if (completedTasksWithReports.length > 0) {
    const tasksBody = completedTasksWithReports.map((t) => {
      const report = t.completionReport;
      const notes: string[] = [];

      if (report?.dynamicNotes) {
        const orderedLabels = ["Today's Output", 'Blockers', "Tomorrow's Plan", 'GitHub Link'];
        const consumed = new Set<string>();
        orderedLabels.forEach((label) => {
          Object.keys(report.dynamicNotes).forEach((k) => {
            if (k.startsWith('__')) return;
            if (normalizeLabel(k) === label && !consumed.has(k)) {
              pushNote(notes, label, report.dynamicNotes[k]);
              consumed.add(k);
            }
          });
        });
        Object.keys(report.dynamicNotes).forEach((k) => {
          if (k.startsWith('__')) return;
          if (!consumed.has(k)) pushNote(notes, normalizeLabel(k), report.dynamicNotes[k]);
        });
      } else {
        pushNote(notes, "Today's Output", report?.output || '');
        pushNote(notes, 'Blockers', report?.blockers || '');
        pushNote(notes, "Tomorrow's Plan", report?.tomorrow || '');
        pushNote(notes, 'GitHub Link', report?.link || '');
      }

      return [t.dateCompleted || '-', t.project || '-', t.name || '-', renderCellProgress(report?.taskProgress), notes.join('\n\n--------------------\n\n') || 'No additional notes'];
    });

    doc.autoTable({
      startY: cursorY + 3,
      head: [['Date', 'Project', 'Task', 'Progress', 'Delivery Notes']],
      body: tasksBody,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 8.5, textColor: [15, 23, 42], cellPadding: 2.1, valign: 'top' },
      columnStyles: { 3: { cellWidth: 32 }, 4: { cellWidth: 56 } },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No completed task notes found for this reporting period.', margin, cursorY + 6);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawFooter(i);
  }

  const fileName = `professional_report_${type}_${today}.pdf`;
  const blob = doc.output('blob');

  return { blob, fileName };
}
