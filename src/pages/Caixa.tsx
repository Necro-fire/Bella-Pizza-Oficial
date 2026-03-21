import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function Caixa() {
  const { cashRegister, openRegister, closeRegister, addMovement, sales } = useStore();
  const [initialAmount, setInitialAmount] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');

  const handleOpen = () => {
    const val = parseFloat(initialAmount);
    if (isNaN(val) || val < 0) { toast.error('Valor inválido'); return; }
    openRegister(val);
    setInitialAmount('');
    toast.success('Caixa aberto!');
  };

  const handleMovement = (type: 'entry' | 'exit') => {
    const val = parseFloat(movAmount);
    if (isNaN(val) || val <= 0 || !movDesc.trim()) { toast.error('Preencha valor e descrição'); return; }
    addMovement({ type, amount: val, description: movDesc });
    setMovAmount('');
    setMovDesc('');
    toast.success(type === 'entry' ? 'Entrada registrada' : 'Saída registrada');
  };

  if (!cashRegister || cashRegister.closedAt) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] animate-fade-in">
        <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
          <Lock className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">Abrir Caixa</h2>
          <p className="text-sm text-muted-foreground">Informe o valor inicial do caixa</p>
          <Input
            type="number"
            placeholder="Valor inicial (R$)"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            className="bg-secondary text-center text-lg"
          />
          <Button onClick={handleOpen} className="w-full bg-primary text-primary-foreground font-bold">
            Abrir Caixa
          </Button>
        </div>
      </div>
    );
  }

  const salesTotal = cashRegister.sales.reduce((s, sale) => s + sale.total, 0);
  const entriesTotal = cashRegister.entries.reduce((s, e) => s + e.amount, 0);
  const exitsTotal = cashRegister.exits.reduce((s, e) => s + e.amount, 0);
  const currentBalance = cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal;

  // Payment breakdown
  const paymentTotals: Record<string, number> = {};
  cashRegister.sales.forEach((sale) => {
    sale.payments.forEach((p) => {
      paymentTotals[p.method] = (paymentTotals[p.method] || 0) + p.amount;
    });
  });

  const movements = [
    ...cashRegister.entries.map((e) => ({ ...e, color: 'text-success', sign: '+' })),
    ...cashRegister.exits.map((e) => ({ ...e, color: 'text-destructive', sign: '-' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caixa</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium flex items-center gap-1">
            <Unlock className="w-3 h-3" /> Aberto
          </span>
          <Button
            onClick={() => { closeRegister(); toast.success('Caixa fechado'); }}
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Valor Inicial', value: cashRegister.initialAmount, color: 'text-foreground' },
          { label: 'Vendas', value: salesTotal, color: 'text-success' },
          { label: 'Entradas/Saídas', value: entriesTotal - exitsTotal, color: entriesTotal - exitsTotal >= 0 ? 'text-success' : 'text-destructive' },
          { label: 'Saldo Atual', value: currentBalance, color: 'text-primary' },
        ].map((c) => (
          <div key={c.label} className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>R$ {c.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Movements */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-bold text-sm">Registrar Movimentação</h3>
          <Input placeholder="Descrição" value={movDesc} onChange={(e) => setMovDesc(e.target.value)} className="bg-secondary" />
          <Input type="number" placeholder="Valor (R$)" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} className="bg-secondary" />
          <div className="flex gap-2">
            <Button onClick={() => handleMovement('entry')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-1">
              <ArrowUpCircle className="w-4 h-4" /> Entrada
            </Button>
            <Button onClick={() => handleMovement('exit')} className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1">
              <ArrowDownCircle className="w-4 h-4" /> Saída
            </Button>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="glass-card p-4">
          <h3 className="font-bold text-sm mb-3">Total por Pagamento</h3>
          <div className="space-y-2">
            {Object.entries(paymentTotals).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda</p>
            ) : (
              Object.entries(paymentTotals).map(([method, total]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{method}</span>
                  <span className="font-medium">R$ {total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History */}
        <div className="glass-card p-4">
          <h3 className="font-bold text-sm mb-3">Histórico</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentações</p>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{m.description}</span>
                  <span className={`font-medium ${m.color}`}>{m.sign} R$ {m.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
