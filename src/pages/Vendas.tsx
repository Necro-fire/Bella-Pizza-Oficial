import { useState, useMemo } from 'react';
import { PinGuard } from '@/components/PinGuard';
import { DateFilter, filterByDate } from '@/components/DateFilter';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Eye, XCircle, Printer, Truck, Store } from 'lucide-react';
import { Sale } from '@/types/pizzaria';
import { ReceiptDialog } from '@/components/pdv/ReceiptDialog';
import { ProfessionalAlert } from '@/components/ui/professional-alert';

export default function Vendas() {
  const { sales, cancelSale } = useStore();
  const [dateRange, setDateRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    let result = filterByDate(sales, dateRange.start, dateRange.end);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.code.includes(q) || s.customerName.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, dateRange, search]);

  const handleCancelConfirm = async () => {
    if (!saleToCancel) return;
    await cancelSale(saleToCancel.id);
    if (selectedSale?.id === saleToCancel.id) {
      setSelectedSale(null);
    }
    toast.success('Venda cancelada');
    setSaleToCancel(null);
  };

  const getItemLabel = (item: Sale['items'][0]) => {
    let label = item.product.name;
    if (item.pizzaSize) label = `Pizza ${item.pizzaSize} ${label}`;
    if (item.secondFlavor) label += ` / ${item.secondFlavor.name}`;
    return label;
  };

  return (
    <PinGuard title="Vendas">
      <div className="p-4 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Vendas</h1>
            <p className="text-xs text-muted-foreground">Histórico de vendas</p>
          </div>
          <DateFilter onFilter={(s, e) => setDateRange({ start: s, end: e })} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código ou cliente..." className="pl-9 bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          {filtered.map(sale => (
            <div key={sale.id} className={`glass-card p-3 flex items-center gap-4 ${sale.cancelled ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">#{sale.code}</span>
                  {sale.cancelled && <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">CANCELADA</span>}
                  {sale.deliveryMode === 'entrega' && (
                    <span className="text-[10px] bg-info/10 text-info px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5" /> Entrega
                    </span>
                  )}
                  {sale.deliveryMode === 'retirada' && (
                    <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Store className="w-2.5 h-2.5" /> Retirada
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{sale.customerName} · {formatDateTime(sale.date)}</p>
              </div>
              <span className="font-bold text-primary">{formatCurrency(sale.total)}</span>
              <div className="flex gap-1">
                <button onClick={() => setSelectedSale(sale)} className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                {!sale.cancelled && (
                  <button onClick={() => setSaleToCancel(sale)} className="p-1.5 rounded bg-secondary hover:bg-destructive/20 text-destructive transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                )}
                <button onClick={() => { setSelectedSale(sale); setShowReceipt(true); }} className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors"><Printer className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>}
        </div>

        {/* Sale detail dialog */}
        <Dialog open={!!selectedSale && !showReceipt} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">Venda #{selectedSale?.code}</DialogTitle></DialogHeader>
            {selectedSale && (
              <div className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Cliente:</span> <span className="text-foreground">{selectedSale.customerName}</span></p>
                  <p><span className="text-muted-foreground">Contato:</span> <span className="text-foreground">{selectedSale.customerContact || 'N/A'}</span></p>
                  <p><span className="text-muted-foreground">Data:</span> <span className="text-foreground">{formatDateTime(selectedSale.date)}</span></p>
                  {selectedSale.deliveryMode && (
                    <p><span className="text-muted-foreground">Modo:</span> <span className="text-foreground capitalize">{selectedSale.deliveryMode}</span></p>
                  )}
                  {selectedSale.cancelled && <p className="text-destructive font-bold">CANCELADA em {formatDateTime(selectedSale.cancelledAt!)}</p>}
                </div>
                {selectedSale.deliveryMode === 'entrega' && selectedSale.deliveryAddress && (
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 text-xs space-y-0.5">
                    <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider mb-1">Endereço</p>
                    <p className="text-foreground">{selectedSale.deliveryAddress.street}, nº {selectedSale.deliveryAddress.number}</p>
                    <p className="text-foreground">{selectedSale.deliveryAddress.neighborhood}</p>
                    {selectedSale.deliveryAddress.cep && <p className="text-muted-foreground">CEP: {selectedSale.deliveryAddress.cep}</p>}
                    {selectedSale.deliveryAddress.reference && <p className="text-muted-foreground">Ref: {selectedSale.deliveryAddress.reference}</p>}
                  </div>
                )}
                <div className="space-y-1">
                  {selectedSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm bg-secondary rounded px-2 py-1">
                      <span className="text-foreground">{item.quantity}x {getItemLabel(item)}</span>
                      <span className="font-bold text-foreground">{formatCurrency(item.calculatedPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-bold"><span className="text-foreground">Total</span><span className="text-primary">{formatCurrency(selectedSale.total)}</span></div>
                  <div className="mt-1 space-y-0.5">
                    {selectedSale.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground"><span className="capitalize">{p.method}</span><span>{formatCurrency(p.amount)}</span></div>
                    ))}
                    {selectedSale.change > 0 && <div className="flex justify-between text-xs text-warning"><span>Troco</span><span>{formatCurrency(selectedSale.change)}</span></div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowReceipt(true)} variant="outline" className="flex-1 gap-1"><Printer className="w-3.5 h-3.5" /> Notas</Button>
                  {!selectedSale.cancelled && <Button onClick={() => setSaleToCancel(selectedSale)} variant="outline" className="border-destructive text-destructive gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelar</Button>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ProfessionalAlert
          open={!!saleToCancel}
          onClose={() => setSaleToCancel(null)}
          variant="error"
          title="Tem certeza que deseja cancelar esta venda?"
          confirmLabel="Cancelar Venda"
          cancelLabel="Voltar"
          onConfirm={handleCancelConfirm}
          onCancel={() => setSaleToCancel(null)}
          showCancel
        />

        <ReceiptDialog sale={selectedSale} open={showReceipt} onOpenChange={setShowReceipt} />
      </div>
    </PinGuard>
  );
}
