/** Paper size of the receipt: 58mm wide by 80mm tall. */
export const PAPER_SIZE = { width: '58mm', height: '80mm' } as const;

/** Thermal printers cannot print up to the edges: 48mm is the usual printable width on 58mm paper. */
const CONTENT_WIDTH = '48mm';

const RECEIPT_CSS = `
  @page { size: ${PAPER_SIZE.width} ${PAPER_SIZE.height}; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
  }
  .receipt-wrapper {
    width: ${CONTENT_WIDTH};
    max-width: 100%;
    margin: 0 auto;
    padding-bottom: 2mm;
    overflow-wrap: anywhere;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .company-name { font-size: 14px; margin-bottom: 2px; }
  .section-title { font-size: 12px; margin-bottom: 4px; }
  .sep { border-top: 1px dashed #000; margin: 5px 0; }
  .spacer { height: 3px; }
  .row { display: flex; justify-content: space-between; gap: 6px; padding: 1px 0; break-inside: avoid; }
  .row span:last-child { white-space: nowrap; }
  .total-row { font-size: 13px; margin-top: 4px; }
  .sub { font-size: 10px; padding-left: 4px; }
  .obs { font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  tr { break-inside: avoid; }
  thead { display: table-row-group; }
  th, td { padding: 2px 0; vertical-align: top; }
  th { font-weight: bold; white-space: nowrap; }
  th:first-child, td:first-child { width: 24px; }
  .left { text-align: left; }
  .right { text-align: right; }
  td.right { white-space: nowrap; padding-left: 4px; }
  .item-sep td { padding: 0; }
  .item-separator { border-top: 1px dashed #000; margin: 3px 0; }
`;

/** Full HTML document used both to print and to preview the receipt. */
export const buildReceiptDocument = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${RECEIPT_CSS}</style></head><body>${content}</body></html>`;
