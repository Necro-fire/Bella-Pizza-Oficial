import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Lock, Unlock, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PinDialog } from '@/components/PinDialog';
import type { PaymentMethod } from '@/types/pizzaria';

export default function Caixa() {
  const { cashRegister, openRegister, closeRegister, addMovement } = useStore();
  const [initialAmount, setInitialAmount] = useState('');
  const [showMovDialog, setShowMovDialog] = useState<'entry' | 'exit' | null>(null);
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movPayment, setMovPayment] = useState<PaymentMethod>('dinheiro');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requirePin = (action: () => void) => {
    setPendingAction(() => action);
    setShowPinDialog(true);
  };

  const handleOpen = () => {
    const val = parseFloat(initialAmount);
    if (isNaN(val) || val < 0) { toast.error('Informe um valor válido'); return; }
    openRegister(val);
    setInitialAmount('');
    toast.success('Caixa aberto com sucesso');
  };

  const handleMovement = () => {
    if (!showMovDialog) return;
    const val = parseFloat(movAmount);
    if (isNaN(val) || val <= 0) { toast.error('Informe um valor válido'); return; }
    if (!movDesc.trim()) { toast.error('Informe uma descrição'); return; }
    addMovement({ type: showMovDialog, amount: val, description: movDesc, paymentMethod: movPayment });
    setMovAmount('');
    setMovDesc('');
    setMovPayment('dinheiro');
    setShowMovDialog(null);
    toast.success(showMovDialog === 'entry' ? 'Entrada registrada' : 'Saída registrada');
  };

  const handleClose = () => {
    setShowCloseConfirm(false);
    closeRegister();
    toast.success('Caixa fechado com sucesso');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao: 'Cartão',
  };

  // --- Closed state ---
  if (!cashRegister || cashRegister.closedAt) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Abrir Caixa</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Informe o valor inicial para abertura do caixa.
          </p>
          <Input
            type="number"
            placeholder="Valor inicial (R$)"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            className="bg-secondary text-foreground"
          />
          <Button onClick={handleOpen} className="w-full">
            Abrir Caixa
          </Button>

          {/* Last session summary */}
          {cashRegister?.closedAt && (
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Último fechamento</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Encerrado em</span>
                  <span className="text-foreground">{fmtDate(cashRegister.closedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas realizadas</span>
                  <span className="text-foreground">{cashRegister.sales.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Calculations ---
  const salesTotal = cashRegister.sales.reduce((s, sale) => s + sale.total, 0);
  const entriesTotal = cashRegister.entries.reduce((s, e) => s + e.amount, 0);
  const exitsTotal = cashRegister.exits.reduce((s, e) => s + e.amount, 0);
  const currentBalance = cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal;
  const expectedBalance = cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal;

  // Payment breakdown from sales
  const paymentTotals: Record<string, number> = {};
  cashRegister.sales.forEach((sale) => {
    sale.payments.forEach((p) => {
      paymentTotals[p.method] = (paymentTotals[p.method] || 0) + p.amount;
    });
  });

  // Movement entries from entries/exits + sales as movements
  const allMovements = [
    ...cashRegister.entries.map((e) => ({
      id: e.id, date: e.date, type: 'entry' as const, description: e.description,
      paymentMethod: (e as any).paymentMethod || 'dinheiro', amount: e.amount,
    })),
    ...cashRegister.exits.map((e) => ({
      id: e.id, date: e.date, type: 'exit' as const, description: e.description,
      paymentMethod: (e as any).paymentMethod || 'dinheiro', amount: e.amount,
    })),
    ...cashRegister.sales.map((s) => ({
      id: s.id, date: s.date, type: 'sale' as const, description: `Venda #${s.id.slice(0, 6)}`,
      paymentMethod: s.payments.map(p => paymentLabels[p.method] || p.method).join(', '),
      amount: s.total,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header: Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Caixa</h1>
          <span className="text-xs bg-success/15 text-success px-2.5 py-1 rounded font-medium flex items-center gap-1.5 border border-success/20">
            <Unlock className="w-3 h-3" /> Aberto
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Aberto em {fmtDate(cashRegister.openedAt)}
          </span>
          <Button
            onClick={() => requirePin(() => setShowCloseConfirm(true))}
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
          >
            Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Saldo Inicial', value: cashRegister.initialAmount, color: 'text-foreground' },
          { label: 'Total Entradas', value: salesTotal + entriesTotal, color: 'text-success' },
          { label: 'Total Saídas', value: exitsTotal, color: 'text-destructive' },
          { label: 'Saldo Atual', value: currentBalance, color: 'text-foreground', bold: true },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${c.color}`}>{fmt(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Actions + Payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Actions */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Ações</h3>
          <div className="space-y-2">
            <Button
              onClick={() => setShowMovDialog('entry')}
              variant="outline"
              className="w-full justify-start gap-2 text-success border-border hover:bg-success/10"
            >
              <ArrowUpRight className="w-4 h-4" /> Registrar Entrada
            </Button>
            <Button
              onClick={() => setShowMovDialog('exit')}
              variant="outline"
              className="w-full justify-start gap-2 text-destructive border-border hover:bg-destructive/10"
            >
              <ArrowDownRight className="w-4 h-4" /> Registrar Saída
            </Button>
          </div>
        </div>

        {/* Payment totals */}
        <div className="bg-card border border-border rounded-lg p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-3">Total por Forma de Pagamento</h3>
          {Object.keys(paymentTotals).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(paymentTotals).map(([method, total]) => (
                <div key={method} className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground capitalize">{paymentLabels[method] || method}</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{fmt(total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Movements table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Movimentações</h3>
        </div>
        {allMovements.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação registrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Data/Hora</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{fmtDate(m.date)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${
                      m.type === 'entry' || m.type === 'sale' ? 'text-success' : 'text-destructive'
                    }`}>
                      {m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Saída' : 'Venda'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">{m.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{m.paymentMethod}</TableCell>
                  <TableCell className={`text-xs text-right font-medium tabular-nums ${
                    m.type === 'exit' ? 'text-destructive' : 'text-success'
                  }`}>
                    {m.type === 'exit' ? '−' : '+'} {fmt(m.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Movement dialog */}
      <Dialog open={!!showMovDialog} onOpenChange={(o) => { if (!o) setShowMovDialog(null); }}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {showMovDialog === 'entry' ? 'Registrar Entrada' : 'Registrar Saída'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Input
                placeholder={showMovDialog === 'exit' ? 'Ex: compra de insumos' : 'Ex: depósito adicional'}
                value={movDesc}
                onChange={(e) => setMovDesc(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor</label>
              <Input
                type="number"
                placeholder="0,00"
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                className="bg-secondary"
              />
            </div>
            {showMovDialog === 'entry' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Forma de Pagamento</label>
                <Select value={movPayment} onValueChange={(v) => setMovPayment(v as PaymentMethod)}>
                  <SelectTrigger className="bg-secondary">
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
            <Button variant="ghost" onClick={() => setShowMovDialog(null)}>Cancelar</Button>
            <Button onClick={handleMovement}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close confirmation dialog */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Fechar Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Confirme os valores antes de fechar o caixa.</p>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo inicial</span>
                <span className="text-foreground tabular-nums">{fmt(cashRegister.initialAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total vendas</span>
                <span className="text-success tabular-nums">{fmt(salesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total entradas</span>
                <span className="text-success tabular-nums">{fmt(entriesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total saídas</span>
                <span className="text-destructive tabular-nums">{fmt(exitsTotal)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-foreground">Saldo final</span>
                <span className="text-foreground tabular-nums">{fmt(expectedBalance)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCloseConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClose}>
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN dialog */}
      <PinDialog
        open={showPinDialog}
        onClose={() => { setShowPinDialog(false); setPendingAction(null); }}
        onSuccess={() => {
          setShowPinDialog(false);
          pendingAction?.();
          setPendingAction(null);
        }}
      />
    </div>
  );
}
