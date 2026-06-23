import { useState, useMemo } from 'react';
import { PinGuard } from '@/components/PinGuard';
import { DateFilter } from '@/components/DateFilter';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { maskCurrency, parseCurrency } from '@/lib/masks';
import { startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ProfessionalAlert } from '@/components/ui/professional-alert';
import { CloseRegisterDialog, type CloseData } from '@/components/caixa/CloseRegisterDialog';
import {
  DollarSign, ArrowDownCircle, ArrowUpCircle, Clock, TrendingUp,
  Wallet, History, ShoppingCart, Lock, Unlock, Timer
} from 'lucide-react';

export default function Caixa() {
  const { cashRegister, cashHistory, openRegister, closeRegister, addMovement, deleteMovement, addAuditLog } = useStore();
  const [initialAmount, setInitialAmount] = useState('');
  const [movType, setMovType] = useState<'reforco' | 'sangria'>('reforco');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [dateRange, setDateRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) });

  // Alert states
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = cashRegister && !cashRegister.closedAt;

  const filteredHistory = useMemo(() =>
    cashHistory.filter(r => { const d = new Date(r.openedAt); return d >= dateRange.start && d <= dateRange.end; }),
    [cashHistory, dateRange]
  );

  const handleOpen = async () => {
    if (isSubmitting) return;
    const a = parseCurrency(initialAmount);
    if (a < 0) { setErrorAlert('Informe um valor inicial válido para abrir o caixa.'); return; }
    setIsSubmitting(true);
    try {
      await openRegister(a);
      setInitialAmount('');
      setSuccessAlert('Caixa aberto com sucesso!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (data: CloseData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const informedAmount = data.cashInRegister + data.cashToSafe + data.cardDebit + data.cardCredit + data.pix + data.online;
      await closeRegister(informedAmount);
      await addAuditLog('REGISTER_CLOSE_DETAIL', JSON.stringify({
        cashInRegister: data.cashInRegister,
        cashToSafe: data.cashToSafe,
        cashForChange: data.cashForChange,
        cardDebit: data.cardDebit,
        cardCredit: data.cardCredit,
        pix: data.pix,
        online: data.online,
        observations: data.observations,
      }));
      setCloseDialogOpen(false);
      setSuccessAlert('Caixa fechado com sucesso! Dados salvos no histórico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovement = async () => {
    if (isSubmitting) return;
    if (!isOpen) { setErrorAlert('Caixa fechado. Abra o caixa para continuar.'); return; }
    const a = parseCurrency(movAmount);
    if (a <= 0) { setErrorAlert('Informe um valor válido para a movimentação.'); return; }
    setIsSubmitting(true);
    try {
      await addMovement({ type: movType, amount: a, description: movDesc || movType, origin: 'manual' });
      setMovAmount(''); setMovDesc('');
      setSuccessAlert('Movimentação registrada com sucesso!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMovement = async () => {
    if (deleteAlertId) {
      await deleteMovement(deleteAlertId);
      setDeleteAlertId(null);
      setSuccessAlert('Movimentação removida.');
    }
  };

  const salesTotal = cashRegister ? cashRegister.sales.filter(s => !s.cancelled).reduce((s, sale) => s + sale.total, 0) : 0;
  const entriesTotal = cashRegister ? cashRegister.entries.reduce((s, e) => s + e.amount, 0) : 0;
  const exitsTotal = cashRegister ? cashRegister.exits.reduce((s, e) => s + e.amount, 0) : 0;
  const currentBalance = cashRegister ? cashRegister.initialAmount + salesTotal + entriesTotal - exitsTotal : 0;
  const activeSalesCount = cashRegister ? cashRegister.sales.filter(s => !s.cancelled).length : 0;

  const getElapsedTime = (openedAt: string): string => {
    const ms = Date.now() - new Date(openedAt).getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}min`;
  };

  return (
    <PinGuard title="Caixa">
      <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Controle de Caixa</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gestão financeira do turno</p>
          </div>
          <div className="flex items-center gap-3">
            {isOpen && cashRegister && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {getElapsedTime(cashRegister.openedAt)}
              </span>
            )}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold border ${
              isOpen
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}>
              {isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isOpen ? 'ABERTO' : 'FECHADO'}
            </div>
            {!isOpen ? (
              <div className="flex items-center gap-2">
                <Input value={initialAmount} onChange={e => setInitialAmount(maskCurrency(e.target.value))}
                  placeholder="R$ 0,00" className="bg-secondary border-border w-44 h-9 text-sm font-mono" />
                <Button onClick={handleOpen} className="bg-success hover:bg-success/90 text-success-foreground font-semibold h-9 text-xs">
                  Abrir Caixa
                </Button>
              </div>
            ) : (
              <Button onClick={() => setCloseDialogOpen(true)} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 text-xs">
                Fechar Caixa
              </Button>
            )}
          </div>
        </div>

        {isOpen && cashRegister && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <FinanceCard label="Saldo Inicial" value={formatCurrency(cashRegister.initialAmount)} icon={<Wallet className="w-4 h-4" />} variant="info" />
              <FinanceCard label="Vendas" value={formatCurrency(salesTotal)} sub={`${activeSalesCount} venda(s)`} icon={<TrendingUp className="w-4 h-4" />} variant="success" />
              <FinanceCard label="Entradas" value={formatCurrency(entriesTotal)} icon={<ArrowDownCircle className="w-4 h-4" />} variant="success" />
              <FinanceCard label="Saídas" value={formatCurrency(exitsTotal)} icon={<ArrowUpCircle className="w-4 h-4" />} variant="destructive" />
              <FinanceCard label="Saldo Atual" value={formatCurrency(currentBalance)} icon={<DollarSign className="w-4 h-4" />} variant={currentBalance >= 0 ? 'primary' : 'destructive'} highlight />
            </div>

            {/* Movement + Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* New Movement */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Nova Movimentação
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setMovType('reforco')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        movType === 'reforco'
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-secondary text-muted-foreground border-border hover:border-muted-foreground/30'
                      }`}>
                      ↓ Reforço
                    </button>
                    <button onClick={() => setMovType('sangria')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        movType === 'sangria'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-secondary text-muted-foreground border-border hover:border-muted-foreground/30'
                      }`}>
                      ↑ Sangria
                    </button>
                  </div>
                  <Input value={movAmount} onChange={e => setMovAmount(maskCurrency(e.target.value))}
                    placeholder="R$ 0,00" className="bg-secondary border-border h-9 text-sm font-mono" />
                  <Input value={movDesc} onChange={e => setMovDesc(e.target.value)}
                    placeholder="Descrição (opcional)" className="bg-secondary border-border h-9 text-sm" />
                  <Button onClick={handleMovement} className="w-full bg-primary hover:bg-primary/90 h-9 font-semibold text-xs">
                    Registrar Movimentação
                  </Button>
                </div>

                {/* Movement list */}
                {(cashRegister.entries.length > 0 || cashRegister.exits.length > 0) && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Movimentações do turno</p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {[...cashRegister.entries.map(e => ({ ...e, _type: 'entry' as const })), ...cashRegister.exits.map(e => ({ ...e, _type: 'exit' as const }))]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-secondary/50 border border-border/50 rounded px-3 py-2 text-xs group">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${m._type === 'entry' ? 'text-success' : 'text-destructive'}`}>
                                {m._type === 'entry' ? '↓' : '↑'}
                              </span>
                              <span className="text-xs text-foreground">{m.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-xs tabular-nums ${m._type === 'entry' ? 'text-success' : 'text-destructive'}`}>
                                {m._type === 'entry' ? '+' : '-'}{formatCurrency(m.amount)}
                              </span>
                              <button onClick={() => setDeleteAlertId(m.id)}
                                className="opacity-0 group-hover:opacity-100 text-destructive text-xs transition-opacity">✕</button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sales list */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-success" />
                  Vendas do Turno ({activeSalesCount})
                </h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {cashRegister.sales.map(s => (
                    <div key={s.id} className={`flex items-center justify-between bg-secondary/50 border border-border/50 rounded px-3 py-2.5 text-sm transition-all ${s.cancelled ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{s.code}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{s.customerName}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-sm tabular-nums ${s.cancelled ? 'text-destructive line-through' : 'text-success'}`}>
                          {formatCurrency(s.total)}
                        </span>
                        {s.cancelled && <p className="text-[10px] text-destructive font-medium">Cancelada</p>}
                      </div>
                    </div>
                  ))}
                  {cashRegister.sales.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhuma venda registrada neste turno</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* History */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-info" /> Histórico de Caixas
            </h3>
            <DateFilter onFilter={(s, e) => setDateRange({ start: s, end: e })} />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredHistory.map(r => {
              const rSales = r.sales.filter(s => !s.cancelled).reduce((s, sale) => s + sale.total, 0);
              const rEntries = r.entries.reduce((s, e) => s + e.amount, 0);
              const rExits = r.exits.reduce((s, e) => s + e.amount, 0);
              const rTotal = r.initialAmount + rSales + rEntries - rExits;
              return (
                <div key={r.id} className="bg-secondary/50 border border-border/50 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{formatDateTime(r.openedAt)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.sales.length} vendas · Inicial: {formatCurrency(r.initialAmount)} · Entradas: {formatCurrency(rEntries)} · Saídas: {formatCurrency(rExits)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold tabular-nums ${rTotal >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(rTotal)}</p>
                </div>
              );
            })}
            {filteredHistory.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum registro no período</p>}
          </div>
        </div>
      </div>

      {/* Professional Dialogs */}
      <CloseRegisterDialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} onConfirm={handleClose} />

      {/* Delete movement alert */}
      <ProfessionalAlert
        open={!!deleteAlertId}
        onClose={() => setDeleteAlertId(null)}
        variant="warning"
        title="Remover movimentação?"
        description="Esta ação não pode ser desfeita. A movimentação será excluída permanentemente."
        confirmLabel="Remover"
        onConfirm={handleDeleteMovement}
      />

      {/* Error alert */}
      <ProfessionalAlert
        open={!!errorAlert}
        onClose={() => setErrorAlert(null)}
        variant="error"
        title="Operação bloqueada"
        description={errorAlert || ''}
        showCancel={false}
        confirmLabel="Entendi"
        onConfirm={() => setErrorAlert(null)}
      />

      {/* Success alert */}
      <ProfessionalAlert
        open={!!successAlert}
        onClose={() => setSuccessAlert(null)}
        variant="success"
        title="Operação concluída"
        description={successAlert || ''}
        showCancel={false}
        confirmLabel="OK"
        onConfirm={() => setSuccessAlert(null)}
      />
    </PinGuard>
  );
}

function FinanceCard({ label, value, sub, icon, variant, highlight }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  variant: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
  highlight?: boolean;
}) {
  const colorMap = {
    primary: { text: 'text-primary', border: 'border-primary/20', bar: 'bg-primary' },
    success: { text: 'text-success', border: 'border-success/20', bar: 'bg-success' },
    warning: { text: 'text-warning', border: 'border-warning/20', bar: 'bg-warning' },
    info: { text: 'text-info', border: 'border-info/20', bar: 'bg-info' },
    destructive: { text: 'text-destructive', border: 'border-destructive/20', bar: 'bg-destructive' },
  };
  const c = colorMap[variant];

  return (
    <div className={`bg-card border ${c.border} rounded-lg p-4 relative overflow-hidden transition-all duration-200 ${highlight ? 'ring-1 ring-primary/20' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <div className={`${c.text} opacity-50`}>{icon}</div>
      </div>
      <p className={`text-2xl font-extrabold ${c.text} tabular-nums leading-tight`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
