import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { fmt, fmtDate, movementTypeLabels } from '@/lib/caixa-utils';
import type { UnifiedMovement } from '@/lib/caixa-utils';

interface CaixaMovementsTableProps {
  movements: UnifiedMovement[];
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function CaixaMovementsTable({ movements, onDelete, canDelete }: CaixaMovementsTableProps) {
  const isPositive = (type: string) => type === 'entry' || type === 'sale' || type === 'reforco';

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Movimentações ({movements.length})
        </h3>
      </div>
      {movements.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Nenhuma movimentação registrada
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Origem</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor</TableHead>
                {canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id} className="hover:bg-secondary/30">
                  <TableCell className="text-xs text-muted-foreground tabular-nums py-2.5">{fmtDate(m.date)}</TableCell>
                  <TableCell className="py-2.5">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                      isPositive(m.type) ? 'text-success' :
                      m.type === 'sangria' ? 'text-warning' : 'text-destructive'
                    }`}>
                      {movementTypeLabels[m.type] || m.type}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                      m.origin === 'pdv' ? 'bg-info/10 text-info' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {m.origin === 'pdv' ? 'PDV' : 'Manual'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground py-2.5">{m.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2.5">{m.paymentMethod}</TableCell>
                  <TableCell className={`text-xs text-right font-semibold tabular-nums py-2.5 ${
                    isPositive(m.type) ? 'text-success' :
                    m.type === 'sangria' ? 'text-warning' : 'text-destructive'
                  }`}>
                    {isPositive(m.type) ? '+' : '−'} {fmt(m.amount)}
                  </TableCell>
                  {canDelete && m.origin === 'manual' && (
                    <TableCell className="py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete?.(m.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  )}
                  {canDelete && m.origin !== 'manual' && <TableCell className="py-2.5" />}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
