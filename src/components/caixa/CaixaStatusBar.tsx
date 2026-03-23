import { Lock, Unlock, Clock, Timer, Hash, User } from 'lucide-react';
import { fmt, fmtDateFull, getElapsedTime } from '@/lib/caixa-utils';
import { CashRegister } from '@/types/pizzaria';

interface CaixaStatusBarProps {
  cashRegister: CashRegister;
}

export function CaixaStatusBar({ cashRegister }: CaixaStatusBarProps) {
  const isOpen = !cashRegister.closedAt;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isOpen ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded">
              <Unlock className="w-3 h-3" />
              ABERTO
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded">
              <Lock className="w-3 h-3" />
              FECHADO
            </div>
          )}
        </div>

        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            {cashRegister.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Abertura: {fmtDateFull(cashRegister.openedAt)}
          </span>
          {isOpen && (
            <span className="flex items-center gap-1.5">
              <Timer className="w-3 h-3" />
              Operação: {getElapsedTime(cashRegister.openedAt)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Operador
          </span>
        </div>
      </div>
    </div>
  );
}
