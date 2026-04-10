import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, PAYMENT_METHODS } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { Printer, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface ReceiptDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPANY_NAME = 'Bella Pizza';
const COMPANY_CNPJ = '61.157280/0001-30';
const COL = 28; // chars that safely fit 55mm at 13px monospace

function pad(left: string, right: string): string {
  const gap = COL - left.length - right.length;
  return left + (gap > 0 ? ' '.repeat(gap) : ' ') + right;
}

function center(text: string): string {
  const p = Math.max(0, Math.floor((COL - text.length) / 2));
  return ' '.repeat(p) + text;
}

function wrap(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const SEP = '─'.repeat(COL);

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  const [showPreview, setShowPreview] = useState(false);

  if (!sale) return null;

  const dateStr = new Date(sale.date).toLocaleDateString('pt-BR');
  const timeStr = new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const buildHTML = (): string => {
    const h = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ln = (t: string, cls = '') => `<div class="${cls}">${h(t).replace(/ /g, '&nbsp;')}</div>`;
    const sep = () => `<div class="sep">${SEP}</div>`;
    const b = (t: string) => ln(t, 'b');
    const ct = (t: string, cls = '') => `<div class="ct ${cls}">${h(t)}</div>`;

    const p: string[] = [];

    // Header
    p.push(ct(COMPANY_NAME, 'company'));
    p.push(ct(`CNPJ: ${COMPANY_CNPJ}`));
    p.push(sep());

    // Order
    p.push(ct(`PEDIDO #${sale.code}`, 'b'));
    p.push(ct(sale.deliveryMode === 'entrega' ? 'ENTREGA' : 'RETIRADA'));
    p.push(ct(`${dateStr} — ${timeStr}`));
    p.push(sep());

    // Customer
    const custName = sale.deliveryMode === 'entrega'
      ? (sale.deliveryAddress?.name || sale.customerName)
      : sale.customerName;
    const custPhone = sale.deliveryMode === 'entrega'
      ? (sale.deliveryAddress?.phone || sale.customerContact)
      : sale.customerContact;

    if (custName || custPhone) {
      p.push(ct('CLIENTE', 'b'));
      if (custName) p.push(ln(`Nome: ${custName}`));
      if (custPhone) p.push(ln(`Telefone: ${custPhone}`));
      p.push(sep());
    }

    // Address
    if (sale.deliveryMode === 'entrega' && sale.deliveryAddress) {
      const addr = sale.deliveryAddress;
      p.push(ct('ENDEREÇO DE ENTREGA', 'b'));
      let addrLine = addr.street;
      if (addr.number) addrLine += `, ${addr.number}`;
      if (addr.neighborhood) addrLine += ` - ${addr.neighborhood}`;
      wrap(addrLine, COL).forEach(l => p.push(ln(l)));
      if (addr.cep) p.push(ln(`CEP: ${addr.cep}`));
      if (addr.complement) wrap(`Compl: ${addr.complement}`, COL).forEach(l => p.push(ln(l)));
      if (addr.reference) wrap(`Ref: ${addr.reference}`, COL).forEach(l => p.push(ln(l)));
      p.push(sep());
    }

    // Items
    p.push(ct('ITENS DO PEDIDO', 'b'));
    p.push(b(pad('Qtd Item', 'Valor')));

    sale.items.forEach(item => {
      let label = item.product.name;
      if (item.pizzaSize) label = `Pizza ${item.pizzaSize} ${label}`;
      const totalItem = item.calculatedPrice * item.quantity;
      const priceStr = formatCurrency(totalItem);
      const qtyStr = `${item.quantity}   `;
      const maxW = COL - qtyStr.length - priceStr.length - 1;

      if (label.length <= maxW) {
        p.push(ln(pad(qtyStr + label, priceStr)));
      } else {
        const wrapped = wrap(label, maxW);
        p.push(ln(pad(qtyStr + wrapped[0], priceStr)));
        for (let i = 1; i < wrapped.length; i++) {
          p.push(ln('    ' + wrapped[i]));
        }
      }

      if (item.secondFlavor) {
        p.push(ln(`    / ${item.secondFlavor.name}`, 'sub'));
      }
      if (item.border) {
        const bPrice = item.borderFree ? 'Grátis' : formatCurrency(item.border.price);
        p.push(ln(`    Borda: ${item.border.name} (${bPrice})`, 'sub'));
      }
      if (item.freeSoda) {
        p.push(ln(`    * Refri grátis - Pizza ${item.pizzaSize}`, 'sub'));
      }
      item.observations.forEach(obs => {
        p.push(ln(`    * ${obs}`, 'sub'));
      });
    });

    p.push(sep());

    // Totals
    const subtotal = sale.total - (sale.deliveryFee || 0);
    p.push(ln(pad('Itens do pedido', formatCurrency(subtotal))));
    if (sale.deliveryFee && sale.deliveryFee > 0) {
      p.push(ln(pad('Taxa de entrega', formatCurrency(sale.deliveryFee))));
    }
    p.push(b(pad('TOTAL', formatCurrency(sale.total))));
    p.push(sep());

    // Payment
    p.push(ct('FORMA DE PAGAMENTO', 'b'));
    sale.payments.forEach(pm => {
      const label = PAYMENT_METHODS.find(m => m.method === pm.method)?.label || pm.method;
      p.push(ln(pad(label, formatCurrency(pm.amount))));
    });
    if (sale.change > 0) {
      p.push(ln(pad('Troco', formatCurrency(sale.change))));
    }
    p.push(sep());

    // Observations
    if (sale.observations && sale.observations.length > 0) {
      p.push(ct('OBSERVAÇÕES', 'b'));
      sale.observations.forEach(o => {
        wrap(o, COL).forEach(l => p.push(ln(l)));
      });
      p.push(sep());
    }

    // Footer
    p.push(ct('Obrigado pela preferência!', 'b'));
    p.push(ct('Volte sempre.'));

    return p.join('\n');
  };

  const receiptCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .receipt {
      font-family: Consolas, 'Courier New', 'Lucida Console', monospace;
      font-size: 13px;
      line-height: 1.25;
      width: 55mm;
      max-width: 55mm;
      margin: 0 auto;
      padding: 1.5mm 2mm;
      color: #000;
      background: #fff;
      overflow: hidden;
    }
    .receipt div {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: pre;
      overflow: hidden;
      text-overflow: clip;
    }
    .receipt .ct {
      text-align: center;
      white-space: normal;
      word-break: break-word;
    }
    .receipt .company {
      font-size: 17px;
      font-weight: bold;
      text-align: center;
      white-space: normal;
      padding: 1mm 0;
    }
    .receipt .b { font-weight: bold; }
    .receipt .sub { color: #333; font-size: 12px; }
    .receipt .sep { color: #aaa; overflow: hidden; }
  `;

  const printCSS = `
    ${receiptCSS}
    @page { size: 55mm auto; margin: 0; }
    body { margin: 0; padding: 0; }
  `;

  const receiptHTML = buildHTML();

  const printReceipt = () => {
    const w = window.open('', '', 'width=250,height=600');
    if (!w) return;
    w.document.write(`<html><head><meta charset="utf-8"><style>${printCSS}</style></head><body><div class="receipt">${receiptHTML}</div></body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Imprimir nota do pedido #{sale.code}?</DialogTitle>
        </DialogHeader>

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
          <div className="bg-white text-black border border-border rounded-lg max-h-[50vh] overflow-y-auto animate-fade-in flex justify-center">
            <style dangerouslySetInnerHTML={{ __html: receiptCSS }} />
            <div className="receipt" dangerouslySetInnerHTML={{ __html: receiptHTML }} />
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Não imprimir
        </Button>
      </DialogContent>
    </Dialog>
  );
}
