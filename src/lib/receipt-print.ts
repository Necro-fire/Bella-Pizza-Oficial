export type PaperWidth = '58' | '80';

export const PAPER_WIDTHS: PaperWidth[] = ['58', '80'];

/**
 * Thermal printers cannot print on the whole roll, so each layout is sized to the
 * printable area (48mm on a 58mm roll, 72mm on an 80mm roll).
 */
const PAPER_LAYOUTS = {
  '58': { width: '48mm', base: 11, company: 14, section: 12, total: 13, sub: 10, qtyColumn: 24 },
  '80': { width: '72mm', base: 12, company: 16, section: 13, total: 14, sub: 11, qtyColumn: 28 },
} as const;

const STORAGE_KEY = 'receipt-paper-width';

/** The paper width depends on the printer, so it is remembered per computer. */
export const loadPaperWidth = (): PaperWidth => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '58' ? '58' : '80';
  } catch {
    return '80';
  }
};

export const savePaperWidth = (paper: PaperWidth): void => {
  try {
    localStorage.setItem(STORAGE_KEY, paper);
  } catch {
    // Storage unavailable: the choice only lasts while the dialog is mounted.
  }
};

const buildReceiptCSS = (paper: PaperWidth): string => {
  const layout = PAPER_LAYOUTS[paper];

  // @page has no "size" on purpose: the roll size comes from the printer driver.
  return `
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Consolas, 'Courier New', monospace;
      font-size: ${layout.base}px;
      color: #000;
      background: #fff;
    }
    .receipt-wrapper {
      width: ${layout.width};
      max-width: 100%;
      margin: 0 auto;
      padding-bottom: 2mm;
      overflow-wrap: anywhere;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .company-name { font-size: ${layout.company}px; margin-bottom: 2px; }
    .section-title { font-size: ${layout.section}px; margin-bottom: 4px; }
    .sep { border-top: 1px dashed #000; margin: 5px 0; }
    .spacer { height: 3px; }
    .row { display: flex; justify-content: space-between; gap: 6px; padding: 1px 0; }
    .row span:last-child { white-space: nowrap; }
    .total-row { font-size: ${layout.total}px; margin-top: 4px; }
    .sub { font-size: ${layout.sub}px; padding-left: 4px; }
    .obs { font-style: italic; }
    table { width: 100%; border-collapse: collapse; font-size: ${layout.base}px; }
    th, td { padding: 2px 0; vertical-align: top; }
    th { font-weight: bold; white-space: nowrap; }
    th:first-child, td:first-child { width: ${layout.qtyColumn}px; }
    .left { text-align: left; }
    .right { text-align: right; }
    td.right { white-space: nowrap; padding-left: 4px; }
    .item-sep td { padding: 0; }
    .item-separator { border-top: 1px dashed #000; margin: 3px 0; }
  `;
};

/** Full HTML document used both to print and to preview the receipt. */
export const buildReceiptDocument = (content: string, paper: PaperWidth): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildReceiptCSS(paper)}</style></head><body>${content}</body></html>`;
