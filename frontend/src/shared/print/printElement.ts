export type PrintOrientation = 'portrait' | 'landscape';

export type PrintOptions = {
  title?: string;
  target?: HTMLElement | null;
  targetId?: string;
  targetSelector?: string;
  pageSize?: 'A4';
  orientation?: PrintOrientation;
  documentLanguage?: string;
  direction?: 'rtl' | 'ltr';
  onEmpty?: () => void;
};

const PRINTING_CLASS = 'printing-selected-content';
const ORIENTATION_PORTRAIT = 'print-orientation-portrait';
const ORIENTATION_LANDSCAPE = 'print-orientation-landscape';
const ORIENTATION_STYLE_ATTR = 'data-print-orientation-style';
const PRINT_PORTAL_ID = 'nokta-print-portal';

function setOrientationStyle(orientation: PrintOrientation) {
  document.querySelectorAll(`style[${ORIENTATION_STYLE_ATTR}]`).forEach((node) => node.remove());
  const style = document.createElement('style');
  style.setAttribute(ORIENTATION_STYLE_ATTR, 'true');
  const size = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  const margin = orientation === 'landscape' ? '8mm' : '10mm';
  style.textContent = `
    @page { size: ${size}; margin: ${margin}; }
    #nokta-print-portal,
    #nokta-print-portal * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  `;
  document.head.appendChild(style);
}

function clearOrientationStyle() {
  document.querySelectorAll(`style[${ORIENTATION_STYLE_ATTR}]`).forEach((node) => node.remove());
}

function resolveTarget(options: PrintOptions): HTMLElement | null {
  if (options.target) return options.target;
  if (options.targetId) return document.getElementById(options.targetId);
  if (options.targetSelector) return document.querySelector<HTMLElement>(options.targetSelector);
  return null;
}

function hasPrintableContent(element: HTMLElement): boolean {
  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  const rows = element.querySelectorAll('tbody tr, .timetable-print-sheet, [data-print-row]');
  if (rows.length > 0) return true;
  return text.length > 8;
}

function prepareCloneForPrint(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.querySelectorAll('[data-no-print], .no-print, button, input, select, textarea, .recharts-wrapper, .recharts-responsive-container').forEach((node) => {
    node.remove();
  });
  clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-hidden, .table-shell, [class*="max-h-"]').forEach((node) => {
    const el = node as HTMLElement;
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
    el.style.height = 'auto';
    el.style.maxWidth = '100%';
  });
  clone.querySelectorAll('table').forEach((table) => {
    table.classList.add('print-table');
    (table as HTMLElement).style.width = '100%';
  });

  // Keep soft cell fills visible in browser print / PDF capture
  clone.querySelectorAll('[data-day-color], .attendance-day-head, .attendance-day-cell').forEach((node) => {
    const el = node as HTMLElement;
    const fromData = el.getAttribute('data-day-color');
    const fromStyle = el.style.backgroundColor;
    const bg = fromData || fromStyle;
    if (bg) {
      el.style.setProperty('background-color', bg, 'important');
      el.style.setProperty('background', bg, 'important');
      if (fromData && fromData.startsWith('#')) {
        el.setAttribute('bgcolor', fromData);
      }
    }
    el.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
    el.style.setProperty('print-color-adjust', 'exact', 'important');
    el.style.setProperty('color-adjust', 'exact', 'important');
  });

  // html2canvas (PDF export) does not always preserve utility classes from the
  // interactive attendance preview. Stabilize the paper layout inline.
  clone.querySelectorAll('.attendance-hard-sheet').forEach((node) => {
    const el = node as HTMLElement;
    el.style.setProperty('background', '#ffffff', 'important');
    el.style.setProperty('color', '#0f172a', 'important');
    el.style.setProperty('font-family', "Tahoma, 'Segoe UI', Arial, sans-serif", 'important');
    el.style.setProperty('padding', '8px', 'important');
  });
  clone.querySelectorAll('.attendance-month-grid').forEach((node) => {
    const el = node as HTMLElement;
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('table-layout', 'fixed', 'important');
    el.style.setProperty('border-collapse', 'collapse', 'important');
    el.style.setProperty('font-size', '11px', 'important');
  });
  clone.querySelectorAll('.attendance-month-grid th, .attendance-month-grid td').forEach((node) => {
    const el = node as HTMLElement;
    const dayColor = el.getAttribute('data-day-color');
    el.style.setProperty('border', '1px solid #94a3b8', 'important');
    el.style.setProperty('color', '#0f172a', 'important');
    el.style.setProperty('text-align', 'center', 'important');
    el.style.setProperty('vertical-align', 'middle', 'important');
    el.style.setProperty('padding', '3px 4px', 'important');
    el.style.setProperty('background', dayColor || '#ffffff', 'important');
  });
  clone.querySelectorAll('.attendance-identity-title, .attendance-head-label').forEach((node) => {
    const el = node as HTMLElement;
    el.style.setProperty('background', '#f8fafc', 'important');
    el.style.setProperty('font-weight', '700', 'important');
  });

  return clone;
}

function ensurePrintPortal(clone: HTMLElement, options: PrintOptions): HTMLElement {
  document.getElementById(PRINT_PORTAL_ID)?.remove();
  const portal = document.createElement('div');
  portal.id = PRINT_PORTAL_ID;
  portal.setAttribute('data-print-portal', 'true');
  portal.setAttribute('data-print-active', 'true');
  portal.className = 'printable-section print-portal-sheet';
  if (options.direction) portal.dir = options.direction;
  if (options.title) {
    const heading = document.createElement('h1');
    heading.className = 'mb-3 text-lg font-bold text-black';
    heading.textContent = options.title;
    portal.appendChild(heading);
  }
  portal.appendChild(clone);
  document.body.appendChild(portal);
  return portal;
}

async function waitForPrintableAssets(element: HTMLElement) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font readiness failures
    }
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
    )
  );
}

function applyDocumentPrintMeta(options: PrintOptions) {
  const root = document.documentElement;
  const previous = {
    title: document.title,
    lang: root.lang,
    dir: root.getAttribute('dir')
  };
  if (options.documentLanguage) root.lang = options.documentLanguage;
  if (options.direction) root.dir = options.direction;
  if (options.title) document.title = options.title;
  return previous;
}

function clearPrintMode(
  previous: { title: string; lang: string; dir: string | null },
  sourceElement: HTMLElement | null
) {
  document.documentElement.classList.remove(PRINTING_CLASS, ORIENTATION_PORTRAIT, ORIENTATION_LANDSCAPE);
  sourceElement?.removeAttribute('data-print-active');
  document.getElementById(PRINT_PORTAL_ID)?.remove();
  clearOrientationStyle();
  document.title = previous.title;
  document.documentElement.lang = previous.lang;
  if (previous.dir == null) document.documentElement.removeAttribute('dir');
  else document.documentElement.setAttribute('dir', previous.dir);
}

/**
 * Print only the selected element on A4.
 * Clones content into a body-level portal so overflow/transform in the app shell cannot clip pages.
 */
export async function printElement(options: PrintOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const element = resolveTarget(options);
  if (!element) {
    options.onEmpty?.();
    return false;
  }

  if (!hasPrintableContent(element)) {
    options.onEmpty?.();
    return false;
  }

  const orientation = options.orientation || 'portrait';
  const previousMeta = applyDocumentPrintMeta(options);
  const clone = prepareCloneForPrint(element);
  const portal = ensurePrintPortal(clone, options);

  document.documentElement.classList.add(PRINTING_CLASS);
  document.documentElement.classList.add(
    orientation === 'landscape' ? ORIENTATION_LANDSCAPE : ORIENTATION_PORTRAIT
  );
  setOrientationStyle(orientation);
  element.setAttribute('data-print-active', 'true');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearPrintMode(previousMeta, element);
    window.removeEventListener('afterprint', cleanup);
  };

  try {
    await waitForPrintableAssets(portal);
    // Allow layout to settle after portal mount
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    window.addEventListener('afterprint', cleanup);
    window.print();
    window.setTimeout(cleanup, 2000);
    return true;
  } catch {
    cleanup();
    return false;
  }
}

export function getPrintDirection(language?: string): 'rtl' | 'ltr' {
  const lang = String(language || 'en').toLowerCase();
  return lang === 'fa' || lang === 'ps' || lang.startsWith('fa') || lang.startsWith('ps') ? 'rtl' : 'ltr';
}

export const printInternals = {
  hasPrintableContent,
  resolveTarget,
  prepareCloneForPrint,
  PRINTING_CLASS,
  ORIENTATION_PORTRAIT,
  ORIENTATION_LANDSCAPE,
  PRINT_PORTAL_ID
};
