import { fmt, paymentLabels } from '@/lib/caixa-utils';
import { CashRegister } from '@/types/pizzaria';

interface CaixaPaymentBreakdownProps {
  cashRegister: CashRegister;
}

export function CaixaPaymentBreakdown({ cashRegister }: CaixaPaymentBreakdownProps) {
  const paymentTotals: Record<string, number> = {};
  cashRegister.sales.forEach((sale) => {
    sale.payments.forEach((p) => {
      paymentTotals[p.method] = (paymentTotals[p.method] || 0) + p.amount;
    });
  });

  // Also include entry movements with payment methods
  cashRegister.entries.forEach((e) => {
    if (e.paymentMethod) {
      const key = `manual_${e.paymentMethod}`;
      paymentTotals[key] = (paymentTotals[key] || 0) + e.amount;
    }
  });

  const salesByMethod = Object.entries(paymentTotals)
    .filter(([key]) => !key.startsWith('manual_'));

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Vendas por Forma de Pagamento
      </h3>
      {salesByMethod.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma venda registrada neste turno</p>
      ) : (
        <div className="space-y-2">
          {salesByMethod.map(([method, total]) => (
            <div key={method} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-muted-foreground">{paymentLabels[method] || method}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Total Vendas</span>
            <span className="text-sm font-bold text-success tabular-nums">
              {fmt(salesByMethod.reduce((s, [, v]) => s + v, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
