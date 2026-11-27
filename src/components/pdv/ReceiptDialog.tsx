import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, PAYMENT_METHODS } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { PAPER_WIDTHS, PaperWidth, buildReceiptDocument, loadPaperWidth, savePaperWidth } from '@/lib/receipt-print';
import { Printer, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface ReceiptDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPANY_NAME = 'Bella Pizza';
const COMPANY_CNPJ = '61.157.280/0001-30';

/** Remove all accents and special characters from text */
const stripAccents = (text: string): string => {
  if (!text) return '';
  // Normalize to NFD to separate base characters from diacritics
  let result = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace common special characters that thermal printers can't handle
  const specialChars: { [key: string]: string } = {
    'ç': 'c',
    'Ç': 'C',
    'ã': 'a',
    'õ': 'o',
    'Ã': 'A',
    'Õ': 'O',
    '—': '-',  // em dash to hyphen
    '–': '-',  // en dash to hyphen
    '…': '...',  // ellipsis
    '®': '',   // registered sign
    '™': '',   // trademark sign
    '©': '',   // copyright sign
    '°': 'o',  // degree symbol
    'º': 'o',  // ordinal indicator
    'ª': 'a',  // feminine ordinal
  };
  
  Object.keys(specialChars).forEach(char => {
    result = result.split(char).join(specialChars[char]);
  });
  
  // Remove any remaining non-ASCII printable characters
  result = result.replace(/[^\u0020-\u007E\n\t]/g, '');
  
  return result;
};

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [paper, setPaper] = useState<PaperWidth>(loadPaperWidth);
  const [previewHeight, setPreviewHeight] = useState(0);

  if (!sale) return null;

  const dateStr = new Date(sale.date).toLocaleDateString('pt-BR');
  const timeStr = new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getItemLabel = (item: Sale['items'][0]) => {
    let label = item.product.name;
    if (item.pizzaSize) label = `Pizza ${item.pizzaSize} ${label}`;
    return label;
  };

  const buildReceiptHTML = (): string => {
    // Separators are CSS borders so they always match the paper width
    const SEP = '<div class="sep"></div>';
    const SPACER = '<div class="spacer"></div>';
    const mainLines: string[] = [];

    // Header - Company
    mainLines.push(`<div class="center bold company-name">${COMPANY_NAME}</div>`);
    mainLines.push(`<div class="center">CNPJ: ${COMPANY_CNPJ}</div>`);
    mainLines.push(SEP);

    // Order info
    mainLines.push(SPACER);
    mainLines.push(`<div class="center bold section-title">PEDIDO #${sale.code}</div>`);
    mainLines.push(`<div class="center">${sale.deliveryMode === 'entrega' ? 'ENTREGA' : 'RETIRADA'}</div>`);
    mainLines.push(`<div class="center">${dateStr} - ${timeStr}</div>`);
    mainLines.push(SPACER);
    mainLines.push(SEP);

    // Customer
    const custName = sale.deliveryMode === 'entrega'
      ? (sale.deliveryAddress?.name || sale.customerName)
      : sale.customerName;
    const custPhone = sale.deliveryMode === 'entrega'
      ? (sale.deliveryAddress?.phone || sale.customerContact)
      : sale.customerContact;

    if (custName || custPhone) {
      mainLines.push(SEP);
      mainLines.push(SPACER);
      mainLines.push(`<div class="center bold section-title">CLIENTE</div>`);
      if (custName) mainLines.push(`<div>Nome: ${stripAccents(custName)}</div>`);
      if (custPhone) mainLines.push(`<div>Telefone: ${stripAccents(custPhone)}</div>`);
      mainLines.push(SPACER);
      mainLines.push(SEP);
    }

    // Delivery address
    if (sale.deliveryMode === 'entrega' && sale.deliveryAddress) {
      const addr = sale.deliveryAddress;
      mainLines.push(SPACER);
      mainLines.push(`<div class="center bold section-title">ENDERECO DE ENTREGA</div>`);
      let addrLine = stripAccents(addr.street);
      if (addr.number) addrLine += `, ${addr.number}`;
      if (addr.neighborhood) addrLine += ` - ${stripAccents(addr.neighborhood)}`;
      mainLines.push(`<div>${addrLine}</div>`);
      if (addr.cep) mainLines.push(`<div>CEP: ${stripAccents(addr.cep)}</div>`);
      if (addr.complement) mainLines.push(`<div>${stripAccents(addr.complement)}</div>`);
      if (addr.reference) mainLines.push(`<div>${stripAccents(addr.reference)}</div>`);
      mainLines.push(SPACER);
      mainLines.push(SEP);
    }

    // Separate paid items from free/promotional items
    const paidItems = sale.items.filter(item => item.calculatedPrice > 0);
    const freeItems = sale.items.filter(item => item.calculatedPrice === 0);

    const renderItemRows = (items: typeof sale.items, lines: string[]) => {
      items.forEach((item, idx) => {
        const label = stripAccents(getItemLabel(item));
        const totalItem = item.calculatedPrice * item.quantity;
        const priceLabel = item.calculatedPrice === 0 ? 'Gratis' : formatCurrency(totalItem);
        lines.push(`<tr><td>${item.quantity}</td><td>${label}</td><td class="right">${priceLabel}</td></tr>`);

        if (item.secondFlavor) {
          lines.push(`<tr><td></td><td colspan="2" class="sub">/ ${stripAccents(item.secondFlavor.name)}</td></tr>`);
        }
        if (item.border) {
          const bPrice = item.borderFree ? 'Gratis' : formatCurrency(item.border.price);
          lines.push(`<tr><td></td><td colspan="2" class="sub">Borda: ${stripAccents(item.border.name)} (${bPrice})</td></tr>`);
        }
        if (item.freeSoda) {
          lines.push(`<tr><td></td><td colspan="2" class="sub">+ ${stripAccents(item.freeSoda.name)} Gratis</td></tr>`);
        }
        item.observations.forEach(obs => {
          lines.push(`<tr><td></td><td colspan="2" class="sub obs">* ${stripAccents(obs)}</td></tr>`);
        });
        // Separator after every item
        lines.push(`<tr class="item-sep"><td colspan="3"><div class="item-separator"></div></td></tr>`);
      });
    };

    // Paid items section
    mainLines.push(SEP);
    mainLines.push(SPACER);
    mainLines.push(`<div class="center bold section-title">ITENS DO PEDIDO</div>`);
    mainLines.push(SPACER);
    mainLines.push(`<table><thead><tr><th class="left">Qtd</th><th class="left">Item</th><th class="right">Valor</th></tr></thead><tbody>`);
    renderItemRows(paidItems.length > 0 ? paidItems : sale.items, mainLines);
    mainLines.push(`</tbody></table>`);
    mainLines.push(SPACER);
    mainLines.push(SEP);

    // Free/promotional items section (only if there are both paid and free items)
    if (paidItems.length > 0 && freeItems.length > 0) {
      mainLines.push(SPACER);
      mainLines.push(`<div class="center bold section-title">ITENS GRATIS</div>`);
      mainLines.push(SPACER);
      mainLines.push(`<table><tbody>`);
      renderItemRows(freeItems, mainLines);
      mainLines.push(`</tbody></table>`);
      mainLines.push(SPACER);
      mainLines.push(SEP);
    }

    // Totals
    mainLines.push(SPACER);
    mainLines.push(`<div class="center bold section-title">TOTAIS</div>`);
    mainLines.push(SPACER);
    const subtotal = sale.total - (sale.deliveryFee || 0);
    mainLines.push(`<div class="row"><span>Itens do pedido</span><span>${formatCurrency(subtotal)}</span></div>`);
    if (sale.deliveryFee && sale.deliveryFee > 0) {
      mainLines.push(`<div class="row"><span>Taxa de entrega</span><span>${formatCurrency(sale.deliveryFee)}</span></div>`);
    }
    mainLines.push(`<div class="row bold total-row"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>`);
    mainLines.push(SPACER);
    mainLines.push(SEP);

    // Payment
    mainLines.push(SPACER);
    mainLines.push(`<div class="center bold section-title">FORMA DE PAGAMENTO</div>`);
    mainLines.push(SPACER);
    sale.payments.forEach(p => {
      const label = PAYMENT_METHODS.find(m => m.method === p.method)?.label || p.method;
      mainLines.push(`<div class="row"><span>${label}</span><span>${formatCurrency(p.amount)}</span></div>`);
    });
    if (sale.change > 0) {
      mainLines.push(`<div class="row"><span>Troco</span><span>${formatCurrency(sale.change)}</span></div>`);
    }
    mainLines.push(SPACER);
    mainLines.push(SEP);

    // Observations
    if (sale.observations && sale.observations.length > 0) {
      mainLines.push(SEP);
      mainLines.push(SPACER);
      mainLines.push(`<div class="center bold section-title">OBSERVACOES</div>`);
      mainLines.push(SPACER);
      sale.observations.forEach(o => mainLines.push(`<div>${stripAccents(o)}</div>`));
      mainLines.push(SPACER);
      mainLines.push(SEP);
    }

    // Sanitize: remove consecutive duplicate separators
    const sanitized: string[] = [];
    for (let i = 0; i < mainLines.length; i++) {
      const isSep = mainLines[i] === SEP;
      const prevIsSep = sanitized.length > 0 && sanitized[sanitized.length - 1] === SEP;
      if (isSep && prevIsSep) continue; // skip duplicate
      sanitized.push(mainLines[i]);
    }

    // Return wrapped structure
    return `
      <div class="receipt-wrapper">
        <div class="receipt-content">
          ${sanitized.join('\n')}
        </div>
      </div>
    `;
  };

  const printReceipt = () => {
    const content = buildReceiptHTML();
    const w = window.open('', '', 'width=320,height=600');
    if (!w) return;
    w.document.write(buildReceiptDocument(content, paper));
    w.document.close();
    w.print();
    w.close();
  };

  const changePaper = (value: PaperWidth) => {
    setPaper(value);
    savePaperWidth(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Imprimir nota do pedido #{sale.code}?</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Papel:</span>
          {PAPER_WIDTHS.map(width => (
            <Button
              key={width}
              variant={paper === width ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              aria-pressed={paper === width}
              onClick={() => changePaper(width)}
            >
              {width}mm
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={printReceipt} className="flex-1 gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Ocultar' : 'Visualizar'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {showPreview && (
          <div className="bg-white text-black border border-border rounded-lg p-4 max-h-[45vh] overflow-y-auto animate-fade-in">
            {/* Same document and width as the printout; sandbox keeps scripts disabled */}
            <iframe
              key={paper}
              title="Pré-visualização da nota"
              sandbox="allow-same-origin"
              srcDoc={buildReceiptDocument(buildReceiptHTML(), paper)}
              onLoad={e => setPreviewHeight(e.currentTarget.contentDocument?.body.scrollHeight ?? 0)}
              className="block mx-auto border-0"
              style={{ width: `${paper}mm`, height: previewHeight }}
            />
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Não imprimir
        </Button>
      </DialogContent>
    </Dialog>
  );
}
