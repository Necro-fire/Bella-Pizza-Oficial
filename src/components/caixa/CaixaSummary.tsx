import { fmt } from '@/lib/caixa-utils';
import { CashRegister } from '@/types/pizzaria';

interface CaixaSummaryProps {
  cashRegister: CashRegister;
}

export function CaixaSummary({ cashRegister }: CaixaSummaryProps) {
  const salesTotal = cashRegister.sales.reduce((s, sale) => s + sale.total, 0);
  const entriesTotal = cashRegister.entries.reduce((s, e) => s + e.amount, 0);
  const exitsTotal = cashRegister.exits.reduce((s, e) => s + e.amount, 0);
  const expectedBalance = cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal;

  const cards = [
    { label: 'Saldo Inicial', value: cashRegister.initialAmount, variant: 'neutral' as const },
    { label: 'Vendas (PDV)', value: salesTotal, variant: 'positive' as const },
    { label: 'Entradas Manuais', value: entriesTotal, variant: 'positive' as const },
    { label: 'Saídas / Sangrias', value: exitsTotal, variant: 'negative' as const },
    { label: 'Saldo Esperado', value: expectedBalance, variant: 'highlight' as const },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-card border rounded-lg p-4 ${
            c.variant === 'highlight' ? 'border-primary/30 bg-primary/5' : 'border-border'
          }`}
        >
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">{c.label}</p>
          <p className={`text-lg font-bold tabular-nums ${
            c.variant === 'positive' ? 'text-success' :
            c.variant === 'negative' ? 'text-destructive' :
            c.variant === 'highlight' ? 'text-primary' :
            'text-foreground'
          }`}>
            {fmt(c.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
