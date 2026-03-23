import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { fmt, paymentLabels } from '@/lib/caixa-utils';
import type { PaymentMethod, MovementType, CashRegister } from '@/types/pizzaria';

interface MovementDialogProps {
  open: boolean;
  type: MovementType | null;
  onClose: () => void;
  onConfirm: (amount: number, description: string, paymentMethod: PaymentMethod) => void;
}

export function MovementDialog({ open, type, onClose, onConfirm }: MovementDialogProps) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('dinheiro');

  const labels: Record<string, { title: string; placeholder: string }> = {
    entry: { title: 'Registrar Entrada', placeholder: 'Ex: depósito adicional' },
    exit: { title: 'Registrar Saída', placeholder: 'Ex: compra de insumos' },
    sangria: { title: 'Sangria de Caixa', placeholder: 'Ex: retirada para cofre' },
    reforco: { title: 'Reforço de Caixa', placeholder: 'Ex: troco adicional' },
  };

  const config = labels[type || 'entry'];

  const handleConfirm = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || !desc.trim()) return;
    onConfirm(val, desc, payment);
    setAmount('');
    setDesc('');
    setPayment('dinheiro');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm">{config?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Descrição</label>
            <Input
              placeholder={config?.placeholder}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-secondary text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Valor (R$)</label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary text-sm"
            />
          </div>
          {(type === 'entry' || type === 'reforco') && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Forma de Pagamento</label>
              <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                <SelectTrigger className="bg-secondary text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!desc.trim() || !amount}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CloseDialogProps {
  open: boolean;
  cashRegister: CashRegister;
  onClose: () => void;
  onConfirm: (informedAmount: number) => void;
}

export function CloseDialog({ open, cashRegister, onClose, onConfirm }: CloseDialogProps) {
  const [informed, setInformed] = useState('');

  const salesTotal = cashRegister.sales.reduce((s, sale) => s + sale.total, 0);
  const entriesTotal = cashRegister.entries.reduce((s, e) => s + e.amount, 0);
  const exitsTotal = cashRegister.exits.reduce((s, e) => s + e.amount, 0);
  const expectedBalance = cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal;
  const informedVal = parseFloat(informed) || 0;
  const diff = informedVal - expectedBalance;

  // Payment totals
  const paymentTotals: Record<string, number> = {};
  cashRegister.sales.forEach((sale) => {
    sale.payments.forEach((p) => {
      paymentTotals[p.method] = (paymentTotals[p.method] || 0) + p.amount;
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Fechamento de Caixa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo inicial</span>
              <span className="text-foreground tabular-nums">{fmt(cashRegister.initialAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total vendas (PDV)</span>
              <span className="text-success tabular-nums">{fmt(salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entradas manuais</span>
              <span className="text-success tabular-nums">{fmt(entriesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saídas / Sangrias</span>
              <span className="text-destructive tabular-nums">{fmt(exitsTotal)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span className="text-foreground">Saldo Esperado</span>
              <span className="text-foreground tabular-nums">{fmt(expectedBalance)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          {Object.keys(paymentTotals).length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-4 space-y-1.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Vendas por pagamento</p>
              {Object.entries(paymentTotals).map(([method, total]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{paymentLabels[method] || method}</span>
                  <span className="text-foreground tabular-nums">{fmt(total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Informed amount */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
              Valor Conferido (R$)
            </label>
            <Input
              type="number"
              placeholder="Informe o valor contado"
              value={informed}
              onChange={(e) => setInformed(e.target.value)}
              className="bg-secondary text-sm"
            />
          </div>

          {/* Difference */}
          {informed && (
            <div className={`rounded-lg p-3 border text-sm ${
              Math.abs(diff) < 0.01
                ? 'bg-success/5 border-success/20'
                : diff > 0
                  ? 'bg-info/5 border-info/20'
                  : 'bg-destructive/5 border-destructive/20'
            }`}>
              <div className="flex justify-between font-semibold">
                <span>Diferença</span>
                <span className={`tabular-nums ${
                  Math.abs(diff) < 0.01 ? 'text-success' : diff > 0 ? 'text-info' : 'text-destructive'
                }`}>
                  {diff > 0 ? '+' : ''}{fmt(diff)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {Math.abs(diff) < 0.01
                  ? 'Caixa confere perfeitamente'
                  : diff > 0
                    ? 'Valor acima do esperado (sobra)'
                    : 'Valor abaixo do esperado (falta)'}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(informedVal)}
            disabled={!informed}
          >
            Confirmar Fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
