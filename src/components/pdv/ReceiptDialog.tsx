import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, PAYMENT_METHODS } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { Printer, Truck, User, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type ReceiptType = 'entregador' | 'cliente' | 'completa';

interface ReceiptDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  const [activePreview, setActivePreview] = useState<ReceiptType | null>(null);
  const { companyName, cnpj } = useAuthStore();

  if (!sale) return null;

  const getItemLabel = (item: Sale['items'][0]) => {
    let label = item.product.name;
    if (item.pizzaSize) label = `Pizza ${item.pizzaSize} ${label}`;
    if (item.secondFlavor) label += ` / ${item.secondFlavor.name}`;
    return label;
  };

  const dateStr = new Date(sale.date).toLocaleDateString('pt-BR');
  const timeStr = new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const paymentLabel = sale.payments.map(p => PAYMENT_METHODS.find(m => m.method === p.method)?.label || p.method).join(', ');
  const internalCost = sale.items.reduce((sum, item) => {
    const productCost = (Number(item.product.cost) || 0) * item.quantity;
    const borderCost = item.border ? Number(item.border.cost || 0) : 0;
    const freeSodaCost = item.freeSoda ? Number(item.freeSoda.cost || 0) : 0;
    return sum + productCost + borderCost + freeSodaCost;
  }, 0);
  const discountValue = sale.items.reduce((sum, item) => {
    const freeBorder = item.borderFree && item.border ? Number(item.border.price || 0) : 0;
    const freeSoda = item.freeSoda ? Number(item.freeSoda.price || 0) : 0;
    return sum + freeBorder + freeSoda;
  }, 0);

  const renderEntregador = () => {
    const lines: string[] = [
      companyName.toUpperCase(),
      cnpj ? `CNPJ: ${cnpj}` : '',
      '',
      'NOTA DO ENTREGADOR',
      `Pedido: ${sale.code}`,
      `Data: ${dateStr} | ${timeStr}`,
      '',
    ].filter(Boolean);
    if (sale.deliveryMode === 'entrega' && sale.deliveryAddress) {
      const addr = sale.deliveryAddress;
      lines.push('ENDEREÇO DE ENTREGA:');
      lines.push(`${addr.street}, nº ${addr.number}`);
      lines.push(`Bairro ${addr.neighborhood}`);
      lines.push(`CEP: ${addr.cep}`);
      if (addr.reference) lines.push(`Referência: ${addr.reference}`);
      if (addr.phone) lines.push(`Telefone: ${addr.phone}`);
      lines.push('');
    }
    lines.push('ITENS (RESUMO):');
    sale.items.forEach(item => {
      lines.push(`${getItemLabel(item)}${item.quantity > 1 ? ` x${item.quantity}` : ''}`);
    });
    lines.push('');
    lines.push(`TOTAL A RECEBER: ${formatCurrency(sale.total)}`);
    lines.push(`Forma de pagamento: ${paymentLabel}`);
    if (sale.observations.length > 0) {
      lines.push('');
      lines.push('OBSERVAÇÕES:');
      sale.observations.forEach(o => lines.push(o));
    }
    return lines.join('\n');
  };

  const renderCliente = () => {
    const lines: string[] = [
      companyName.toUpperCase(),
      cnpj ? `CNPJ: ${cnpj}` : '',
      'Obrigado pela preferência!',
      '',
      'NOTA DO CLIENTE',
      `Pedido: ${sale.code}`,
      `Data: ${dateStr} | ${timeStr}`,
      '',
      'Itens:',
    ].filter(Boolean);
    sale.items.forEach(item => {
      const price = item.calculatedPrice * item.quantity;
      lines.push(`${item.quantity}x ${getItemLabel(item)} .......... ${formatCurrency(price)}`);
      if (item.border) {
        const borderPrice = item.borderFree ? 'Grátis' : formatCurrency(item.border.price);
        lines.push(`  • Borda ${item.border.name}: ${borderPrice}`);
      }
      item.observations.forEach(obs => lines.push(`  • ${obs}`));
    });
    lines.push('');
    lines.push('--------------------------------------');
    const subtotal = sale.total - (sale.deliveryFee || 0);
    if (sale.deliveryFee && sale.deliveryFee > 0) {
      lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
      lines.push(`Taxa de Entrega: ${formatCurrency(sale.deliveryFee)}`);
    }
    lines.push(`TOTAL: ${formatCurrency(sale.total)}`);
    lines.push(`Forma de pagamento: ${paymentLabel}`);
    if (sale.change > 0) lines.push(`Troco: ${formatCurrency(sale.change)}`);
    lines.push('--------------------------------------');
    lines.push('Volte sempre!');
    return lines.join('\n');
  };

  const renderCompleta = () => {
    const lines: string[] = [
      `${companyName.toUpperCase()} LTDA`,
      cnpj ? `CNPJ: ${cnpj}` : '',
      '',
      'NOTA COMPLETA',
      `Pedido: ${sale.code}`,
      `Data: ${dateStr} | ${timeStr}`,
      '',
    ].filter(Boolean);
    if (sale.customerName || sale.customerContact) {
      lines.push('CLIENTE:');
      if (sale.customerName) lines.push(`Nome: ${sale.customerName}`);
      if (sale.customerContact) lines.push(`Telefone: ${sale.customerContact}`);
      lines.push('');
    }
    if (sale.deliveryMode === 'entrega' && sale.deliveryAddress) {
      const addr = sale.deliveryAddress;
      lines.push('ENTREGA:');
      lines.push(`${addr.street}, nº ${addr.number} – ${addr.neighborhood}`);
      lines.push(`CEP: ${addr.cep}`);
      if (addr.complement) lines.push(`Complemento: ${addr.complement}`);
      if (addr.reference) lines.push(`Referência: ${addr.reference}`);
      lines.push('');
    }
    lines.push('ITENS:');
    sale.items.forEach(item => {
      const price = item.calculatedPrice * item.quantity;
      lines.push(`${getItemLabel(item)} .............. ${formatCurrency(price)}`);
      if (item.border) {
        const borderPrice = item.borderFree ? 'Grátis' : formatCurrency(item.border.price);
        lines.push(`  • Borda ${item.border.name}: ${borderPrice}`);
      }
      item.observations.forEach(obs => lines.push(`  • ${obs}`));
    });
    lines.push('');
    lines.push('RESUMO FINANCEIRO:');
    const subtotal = sale.total - (sale.deliveryFee || 0);
    lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
    lines.push(`Descontos/Benefícios: ${formatCurrency(discountValue)}`);
    if (sale.deliveryFee && sale.deliveryFee > 0) {
      lines.push(`Taxa de Entrega: ${formatCurrency(sale.deliveryFee)}`);
    }
    lines.push(`TOTAL FINAL: ${formatCurrency(sale.total)}`);
    lines.push(`Custos internos: ${formatCurrency(internalCost)}`);
    lines.push(`Resultado bruto: ${formatCurrency(sale.total - internalCost)}`);
    lines.push(`Forma de pagamento: ${paymentLabel}`);
    if (sale.change > 0) lines.push(`Troco: ${formatCurrency(sale.change)}`);
    lines.push('');
    lines.push('Obrigado pela preferência!');
    return lines.join('\n');
  };

  const getContent = (type: ReceiptType) => {
    switch (type) {
      case 'entregador': return renderEntregador();
      case 'cliente': return renderCliente();
      case 'completa': return renderCompleta();
    }
  };

  const printReceipt = (type: ReceiptType) => {
    const content = getContent(type);
    const w = window.open('', '', 'width=320,height=600');
    if (!w) return;
    w.document.write(`<html><head><style>body{font-family:monospace;font-size:12px;width:80mm;margin:0 auto;padding:10px;white-space:pre-wrap;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const receiptOptions: { value: ReceiptType; label: string; icon: React.ReactNode }[] = [
    { value: 'cliente', label: 'Nota do Cliente', icon: <User className="w-4 h-4" /> },
    { value: 'entregador', label: 'Nota do Entregador', icon: <Truck className="w-4 h-4" /> },
    { value: 'completa', label: 'Nota Completa', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Deseja imprimir alguma nota?</DialogTitle>
          <p className="text-sm text-muted-foreground">Pedido #{sale.code}</p>
        </DialogHeader>

        <div className="space-y-2">
          {receiptOptions.map(opt => (
            <div key={opt.value} className="flex items-center gap-3 bg-secondary border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {opt.icon}
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => setActivePreview(activePreview === opt.value ? null : opt.value)}
                >
                  {activePreview === opt.value ? 'Ocultar' : 'Visualizar'}
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 gap-1"
                  onClick={() => printReceipt(opt.value)}
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </Button>
              </div>
            </div>
          ))}
        </div>

        {activePreview && (
          <div className="font-mono text-[11px] leading-relaxed bg-secondary border border-border text-foreground p-4 rounded-lg whitespace-pre-wrap max-h-[35vh] overflow-y-auto animate-fade-in">
            {getContent(activePreview)}
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Não imprimir
        </Button>
      </DialogContent>
    </Dialog>
  );
}
