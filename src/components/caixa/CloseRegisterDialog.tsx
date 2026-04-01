import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/format';
import { maskCurrency, parseCurrency } from '@/lib/masks';
import {
  AlertTriangle, DollarSign, Vault, ArrowRightLeft, CreditCard,
  Smartphone, Globe, FileText, CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react';

function CurrencyField({ label, value, onChange, icon, required }: {
  label: string; value: string; onChange: (v: string) => void;
  icon: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
        {icon} {label} {required && <span className="text-destructive">*</span>}
      </label>
      <Input
        value={value}
        onChange={e => onChange(maskCurrency(e.target.value))}
        placeholder="R$ 0,00"
        className="bg-secondary border-border h-9 text-sm font-mono"
      />
    </div>
  );
}

interface CloseRegisterDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CloseData) => void;
}

export interface CloseData {
  cashInRegister: number;
  cashToSafe: number;
  cashForChange: number;
  cardDebit: number;
  cardCredit: number;
  pix: number;
  online: number;
  observations: string;
}

export function CloseRegisterDialog({ open, onClose, onConfirm }: CloseRegisterDialogProps) {
  const { cashRegister } = useStore();
  const [step, setStep] = useState<'form' | 'summary'>('form');

  const [cashInRegister, setCashInRegister] = useState('');
  const [cashToSafe, setCashToSafe] = useState('');
  const [cashForChange, setCashForChange] = useState('');
  const [cardDebit, setCardDebit] = useState('');
  const [cardCredit, setCardCredit] = useState('');
  const [pix, setPix] = useState('');
  const [online, setOnline] = useState('');
  const [observations, setObservations] = useState('');

  const salesTotal = useMemo(() => {
    if (!cashRegister) return 0;
    return cashRegister.sales.filter(s => !s.cancelled).reduce((s, sale) => s + sale.total, 0);
  }, [cashRegister]);

  const entriesTotal = useMemo(() => cashRegister?.entries.reduce((s, e) => s + e.amount, 0) ?? 0, [cashRegister]);
  const exitsTotal = useMemo(() => cashRegister?.exits.reduce((s, e) => s + e.amount, 0) ?? 0, [cashRegister]);
  const expectedBalance = (cashRegister?.initialAmount ?? 0) + salesTotal + entriesTotal - exitsTotal;

  const systemPayments = useMemo(() => {
    if (!cashRegister) return {};
    const map: Record<string, number> = {};
    cashRegister.sales.filter(s => !s.cancelled).forEach(sale => {
      sale.payments.forEach(p => {
        map[p.method] = (map[p.method] || 0) + p.amount;
      });
    });
    return map;
  }, [cashRegister]);

  if (!cashRegister || !open) return null;

  const vals = {
    cashInRegister: parseCurrency(cashInRegister),
    cashToSafe: parseCurrency(cashToSafe),
    cashForChange: parseCurrency(cashForChange),
    cardDebit: parseCurrency(cardDebit),
    cardCredit: parseCurrency(cardCredit),
    pix: parseCurrency(pix),
    online: parseCurrency(online),
  };

  const declaredTotal = vals.cashInRegister + vals.cashToSafe + vals.cardDebit + vals.cardCredit + vals.pix + vals.online;
  const difference = declaredTotal - expectedBalance;

  const canProceed = cashForChange.length > 0;

  const handleNext = () => {
    if (!canProceed) return;
    setStep('summary');
  };

  const handleConfirm = () => {
    onConfirm({
      ...vals,
      cashForChange: vals.cashForChange,
      observations,
    });
    resetForm();
  };

  const resetForm = () => {
    setStep('form');
    setCashInRegister('');
    setCashToSafe('');
    setCashForChange('');
    setCardDebit('');
    setCardCredit('');
    setPix('');
    setOnline('');
    setObservations('');
  };


  const getDiffColor = () => {
    if (Math.abs(difference) < 0.01) return 'text-success';
    return difference > 0 ? 'text-info' : 'text-destructive';
  };

  const getDiffBg = () => {
    if (Math.abs(difference) < 0.01) return 'bg-success/5 border-success/20';
    return difference > 0 ? 'bg-info/5 border-info/20' : 'bg-destructive/5 border-destructive/20';
  };

  const getDiffIcon = () => {
    if (Math.abs(difference) < 0.01) return <CheckCircle2 className="w-5 h-5 text-success" />;
    return difference > 0 ? <MinusCircle className="w-5 h-5 text-info" /> : <XCircle className="w-5 h-5 text-destructive" />;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="sm:max-w-[560px] bg-card/95 backdrop-blur-xl border-border shadow-2xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="h-1 bg-destructive" />
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Fechamento de Caixa</h2>
              <p className="text-xs text-muted-foreground">Preencha os valores conferidos</p>
            </div>
          </div>
        </div>

        {step === 'form' ? (
          <div className="px-6 pb-6 space-y-5">
            {/* System summary */}
            <div className="bg-secondary/30 rounded-lg p-4 space-y-1.5 text-sm border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Resumo do sistema</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo inicial</span><span className="tabular-nums">{formatCurrency(cashRegister.initialAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vendas</span><span className="text-success tabular-nums">{formatCurrency(salesTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entradas</span><span className="text-success tabular-nums">{formatCurrency(entriesTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saídas / Sangrias</span><span className="text-destructive tabular-nums">{formatCurrency(exitsTotal)}</span></div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold">
                <span>Saldo esperado</span><span className="tabular-nums">{formatCurrency(expectedBalance)}</span>
              </div>
            </div>

            {/* Cash fields */}
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">💵 Dinheiro</p>
              <CurrencyField label="Dinheiro em caixa" value={cashInRegister} onChange={setCashInRegister} icon={<DollarSign className="w-3 h-3" />} />
              <CurrencyField label="Enviado ao cofre (opcional)" value={cashToSafe} onChange={setCashToSafe} icon={<Vault className="w-3 h-3" />} />
              <CurrencyField label="Troco para o próximo dia" value={cashForChange} onChange={setCashForChange} icon={<ArrowRightLeft className="w-3 h-3" />} required />
            </div>

            {/* Payment verification */}
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">💳 Conferência de pagamentos</p>
              <div className="grid grid-cols-2 gap-3">
                <CurrencyField label="Cartão Débito" value={cardDebit} onChange={setCardDebit} icon={<CreditCard className="w-3 h-3" />} />
                <CurrencyField label="Cartão Crédito" value={cardCredit} onChange={setCardCredit} icon={<CreditCard className="w-3 h-3" />} />
                <CurrencyField label="PIX" value={pix} onChange={setPix} icon={<Smartphone className="w-3 h-3" />} />
                <CurrencyField label="Online" value={online} onChange={setOnline} icon={<Globe className="w-3 h-3" />} />
              </div>
            </div>

            {/* System vs declared comparison */}
            {Object.keys(systemPayments).length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-xs border border-border/50">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Valores do sistema (referência)</p>
                {Object.entries(systemPayments).map(([method, total]) => (
                  <div key={method} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{method === 'dinheiro' ? 'Dinheiro' : method === 'pix' ? 'Pix' : method === 'debito' ? 'Débito' : method === 'credito' ? 'Crédito' : method}</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Observations */}
            <div>
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Observações do operador (opcional)
              </label>
              <Textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Observações sobre o fechamento..."
                className="bg-secondary border-border text-sm resize-none h-16"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { onClose(); resetForm(); }}>Cancelar</Button>
              <Button size="sm" onClick={handleNext} disabled={!canProceed} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
                Revisar Fechamento
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {/* Summary review */}
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Resumo do fechamento</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Dinheiro em caixa</span><span className="tabular-nums">{formatCurrency(vals.cashInRegister)}</span></div>
              {vals.cashToSafe > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Enviado ao cofre</span><span className="tabular-nums">{formatCurrency(vals.cashToSafe)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Troco próximo dia</span><span className="tabular-nums">{formatCurrency(vals.cashForChange)}</span></div>
              {vals.cardDebit > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cartão Débito</span><span className="tabular-nums">{formatCurrency(vals.cardDebit)}</span></div>}
              {vals.cardCredit > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cartão Crédito</span><span className="tabular-nums">{formatCurrency(vals.cardCredit)}</span></div>}
              {vals.pix > 0 && <div className="flex justify-between"><span className="text-muted-foreground">PIX</span><span className="tabular-nums">{formatCurrency(vals.pix)}</span></div>}
              {vals.online > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Online</span><span className="tabular-nums">{formatCurrency(vals.online)}</span></div>}
              <div className="border-t border-border pt-1.5 flex justify-between font-bold">
                <span>Total declarado</span><span className="tabular-nums">{formatCurrency(declaredTotal)}</span>
              </div>
            </div>

            {/* Difference */}
            <div className={`rounded-lg p-4 border ${getDiffBg()}`}>
              <div className="flex items-center gap-3">
                {getDiffIcon()}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Diferença</span>
                    <span className={`text-lg font-extrabold tabular-nums ${getDiffColor()}`}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {Math.abs(difference) < 0.01 ? 'Caixa confere perfeitamente ✓' :
                      difference > 0 ? 'Valor acima do esperado (sobra)' : 'Valor abaixo do esperado (falta)'}
                  </p>
                </div>
              </div>
            </div>

            {observations && (
              <div className="bg-secondary/30 rounded-lg p-3 text-xs border border-border/50">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Observações</p>
                <p className="text-foreground">{observations}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setStep('form')}>Voltar</Button>
              <Button size="sm" onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
                Confirmar Fechamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
