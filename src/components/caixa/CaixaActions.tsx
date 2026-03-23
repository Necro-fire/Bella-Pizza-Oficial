import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Scissors, PlusCircle, XCircle } from 'lucide-react';

interface CaixaActionsProps {
  onEntry: () => void;
  onExit: () => void;
  onSangria: () => void;
  onReforco: () => void;
  onClose: () => void;
}

export function CaixaActions({ onEntry, onExit, onSangria, onReforco, onClose }: CaixaActionsProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operações</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Button
          onClick={onEntry}
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-success border-border hover:bg-success/5 hover:border-success/30 text-xs h-9"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
        </Button>
        <Button
          onClick={onExit}
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-destructive border-border hover:bg-destructive/5 hover:border-destructive/30 text-xs h-9"
        >
          <ArrowDownRight className="w-3.5 h-3.5" /> Saída
        </Button>
        <Button
          onClick={onSangria}
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-warning border-border hover:bg-warning/5 hover:border-warning/30 text-xs h-9"
        >
          <Scissors className="w-3.5 h-3.5" /> Sangria
        </Button>
        <Button
          onClick={onReforco}
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-info border-border hover:bg-info/5 hover:border-info/30 text-xs h-9"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Reforço
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-muted-foreground border-border hover:bg-destructive/5 hover:border-destructive/30 text-xs h-9"
        >
          <XCircle className="w-3.5 h-3.5" /> Fechar Caixa
        </Button>
      </div>
    </div>
  );
}
