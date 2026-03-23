import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { fmtDate } from '@/lib/caixa-utils';
import type { AuditLog } from '@/types/pizzaria';

interface CaixaAuditLogProps {
  logs: AuditLog[];
}

export function CaixaAuditLog({ logs }: CaixaAuditLogProps) {
  const recent = logs.slice(0, 20);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Log de Auditoria ({logs.length})
        </h3>
      </div>
      {recent.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Nenhum registro de auditoria
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Data</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Ação</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Detalhes</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((log) => (
                <TableRow key={log.id} className="hover:bg-secondary/30">
                  <TableCell className="text-xs text-muted-foreground tabular-nums py-2">{fmtDate(log.date)}</TableCell>
                  <TableCell className="py-2">
                    <span className="text-[11px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground py-2">{log.details}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize py-2">{log.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
