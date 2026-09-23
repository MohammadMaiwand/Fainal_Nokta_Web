import type { PrintOrientation } from './printElement';
import { printInternals } from './printElement';

export type ExportFormat = 'pdf' | 'excel';

export type ExportOptions = {
  target?: HTMLElement | null;
  targetId?: string;
  targetSelector?: string;
  title?: string;
  fileName?: string;
  orientation?: PrintOrientation;
  onEmpty?: () => void;
};

const EXPORT_PORTAL_ID = 'nokta-export-portal';

function resolveTarget(options: ExportOptions): HTMLElement | null {
  return printInternals.resolveTarget(options);
}

function sanitizeFileName(value: string) {
  return String(value || 'export')
    .trim()
    .replace(/[^\w\u0600-\u06FF\u0750-\u077F\-.]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'export';
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportPortal(source: HTMLElement, orientation: PrintOrientation, title?: string) {
  document.getElementById(EXPORT_PORTAL_ID)?.remove();
  const clone = printInternals.prepareCloneForPrint(source);
  const portal = document.createElement('div');
  portal.id = EXPORT_PORTAL_ID;
  portal.className = 'printable-section print-portal-sheet';
  portal.setAttribute('data-export-portal', 'true');
  portal.dir = document.documentElement.dir || 'rtl';

  // Fixed A4 content width so PDF/Excel capture matches print layout
  const widthMm = orientation === 'landscape' ? 297 : 210;
  const widthPx = Math.round((widthMm / 25.4) * 96);
  portal.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${widthPx}px`,
    'max-width:none',
    'background:#ffffff',
    'color:#000000',
    'padding:16px',
    'box-sizing:border-box',
    'overflow:visible',
    'z-index:-1',
    '-webkit-print-color-adjust:exact',
    'print-color-adjust:exact',
    'color-adjust:exact'
  ].join(';');

  if (title) {
    const heading = document.createElement('h1');
    heading.textContent = title;
    heading.style.cssText = 'margin:0 0 12px;font-size:18px;font-weight:700;color:#000;';
    portal.appendChild(heading);
  }

  portal.appendChild(clone);
  document.body.appendChild(portal);
  return { portal, widthPx, widthMm };
}

function cleanupExportPortal() {
  document.getElementById(EXPORT_PORTAL_ID)?.remove();
}

function tablesToCsv(element: HTMLElement): string {
  const lines: string[] = [];
  const tables = Array.from(element.querySelectorAll('table'));

  const pushRow = (cells: string[]) => {
    lines.push(cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
  };

  if (!tables.length) {
    const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
    if (text) pushRow([text]);
    return `\uFEFF${lines.join('\n')}`;
  }

  tables.forEach((table, tableIndex) => {
    if (tableIndex > 0) lines.push('');
    Array.from(table.querySelectorAll('tr')).forEach((row) => {
      const cells = Array.from(row.querySelectorAll('th,td')).map((cell) =>
        String(cell.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
      );
      if (cells.some(Boolean)) pushRow(cells);
    });
  });

  return `\uFEFF${lines.join('\n')}`;
}

function tablesToExcelHtml(element: HTMLElement, title?: string): string {
  const tables = Array.from(element.querySelectorAll('table'));
  const titleHtml = title ? `<h2>${title.replace(/</g, '&lt;')}</h2>` : '';
  if (!tables.length) {
    const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
    return `<!doctype html><html><head><meta charset="utf-8" /></head><body>${titleHtml}<p>${text.replace(/</g, '&lt;')}</p></body></html>`;
  }

  const tableHtml = tables
    .map((table) => {
      const clone = table.cloneNode(true) as HTMLTableElement;
      clone.setAttribute('border', '1');
      clone.style.borderCollapse = 'collapse';
      clone.style.width = '100%';
      clone.querySelectorAll('th,td').forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.border = '1px solid #000';
        el.style.padding = '3px 4px';
        el.style.verticalAlign = 'middle';
        el.style.textAlign = 'center';
        const bg = el.style.backgroundColor || window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          el.style.backgroundColor = bg;
        }
      });
      return clone.outerHTML;
    })
    .join('<br/>');

  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    table { border-collapse: collapse; width: 100%; font-family: Tahoma, Arial, sans-serif; font-size: 10px; }
    th, td { border: 1px solid #000; text-align: center; vertical-align: middle; }
  </style></head><body>${titleHtml}${tableHtml}</body></html>`;
}

export async function exportElementToExcel(options: ExportOptions = {}): Promise<boolean> {
  const element = resolveTarget(options);
  if (!element || !printInternals.hasPrintableContent(element)) {
    options.onEmpty?.();
    return false;
  }

  const orientation = options.orientation || 'portrait';
  const { portal } = buildExportPortal(element, orientation, options.title);
  try {
    const html = tablesToExcelHtml(portal, options.title);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFileName(options.fileName || options.title || 'export')}.xls`);
    return true;
  } finally {
    cleanupExportPortal();
  }
}

export async function exportElementToPdf(options: ExportOptions = {}): Promise<boolean> {
  const element = resolveTarget(options);
  if (!element || !printInternals.hasPrintableContent(element)) {
    options.onEmpty?.();
    return false;
  }

  const orientation = options.orientation || 'portrait';
  const { portal, widthMm } = buildExportPortal(element, orientation, options.title);

  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

    const canvas = await html2canvas(portal, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: portal.scrollWidth,
      windowHeight: portal.scrollHeight,
      onclone: (_document, cloned) => {
        cloned.querySelectorAll('.attendance-day-head, .attendance-day-cell').forEach((node) => {
          const el = node as HTMLElement;
          el.style.setProperty('-webkit-print-color-adjust', 'exact');
          el.style.setProperty('print-color-adjust', 'exact');
        });
      }
    });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = widthMm;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;
    const image = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(image, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 1) {
      position -= pageHeight;
      pdf.addPage('a4', orientation);
      pdf.addImage(image, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${sanitizeFileName(options.fileName || options.title || 'export')}.pdf`);
    return true;
  } finally {
    cleanupExportPortal();
  }
}

export async function exportElement(format: ExportFormat, options: ExportOptions = {}): Promise<boolean> {
  if (format === 'excel') return exportElementToExcel(options);
  return exportElementToPdf(options);
}

/** Also expose CSV helper for callers that prefer pure CSV over Excel HTML */
export function exportElementToCsv(options: ExportOptions = {}): boolean {
  const element = resolveTarget(options);
  if (!element || !printInternals.hasPrintableContent(element)) {
    options.onEmpty?.();
    return false;
  }
  const csv = tablesToCsv(element);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${sanitizeFileName(options.fileName || options.title || 'export')}.csv`);
  return true;
}
