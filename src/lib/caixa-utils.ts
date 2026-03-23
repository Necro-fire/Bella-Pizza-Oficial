import { CashMovement, Sale, PaymentMethod } from '@/types/pizzaria';

export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

export const fmtDateFull = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

export const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
};

export const movementTypeLabels: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  sangria: 'Sangria',
  reforco: 'Reforço',
  sale: 'Venda',
};

export function getElapsedTime(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}min`;
}

export interface UnifiedMovement {
  id: string;
  date: string;
  type: 'entry' | 'exit' | 'sangria' | 'reforco' | 'sale';
  origin: 'manual' | 'pdv';
  description: string;
  paymentMethod: string;
  amount: number;
}

export function buildUnifiedMovements(
  entries: CashMovement[],
  exits: CashMovement[],
  sales: Sale[]
): UnifiedMovement[] {
  return [
    ...entries.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type as UnifiedMovement['type'],
      origin: (e.origin || 'manual') as 'manual' | 'pdv',
      description: e.description,
      paymentMethod: paymentLabels[e.paymentMethod || 'dinheiro'] || e.paymentMethod || 'Dinheiro',
      amount: e.amount,
    })),
    ...exits.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type as UnifiedMovement['type'],
      origin: (e.origin || 'manual') as 'manual' | 'pdv',
      description: e.description,
      paymentMethod: paymentLabels[e.paymentMethod || 'dinheiro'] || e.paymentMethod || 'Dinheiro',
      amount: e.amount,
    })),
    ...sales.map((s) => ({
      id: s.id,
      date: s.date,
      type: 'sale' as const,
      origin: 'pdv' as const,
      description: `Venda #${s.id.slice(0, 6)}`,
      paymentMethod: s.payments.map((p) => paymentLabels[p.method] || p.method).join(', '),
      amount: s.total,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
