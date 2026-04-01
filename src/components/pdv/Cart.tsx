import { useState } from 'react';
import { Minus, Plus, Trash2, MessageSquare, X, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { PaymentMethod, PAYMENT_METHODS, PaymentSplit, DeliveryMode, DeliveryAddress } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { maskPhone, maskCEP, maskCurrency, parseCurrency } from '@/lib/masks';
import { toast } from 'sonner';
import { ReceiptDialog } from './ReceiptDialog';

export function Cart() {
  const { cart, removeFromCart, updateCartItem, clearCart, finalizeSale, cashRegister } = useStore();
  const [showPayment, setShowPayment] = useState(false);
  const [payments, setPayments] = useState<PaymentSplit[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod | null>(null);
  const [currentAmount, setCurrentAmount] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [obsInput, setObsInput] = useState('');
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delivery state
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('retirada');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    name: '', phone: '', cep: '', street: '', number: '', neighborhood: '', complement: '', reference: '',
  });
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('');

  const isOpen = cashRegister && !cashRegister.closedAt;
  const subtotalProducts = cart.reduce((s, i) => s + i.calculatedPrice * i.quantity, 0);
  const deliveryFeeValue = deliveryMode === 'entrega' ? parseCurrency(deliveryFeeInput) : 0;
  const total = subtotalProducts + deliveryFeeValue;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  const guardCaixa = (): boolean => {
    if (!isOpen) { toast.error('Caixa fechado. Abra o caixa para continuar.'); return false; }
    return true;
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (!guardCaixa()) return;
    updateCartItem(itemId, { quantity: Math.max(1, newQty) });
  };

  const addPayment = () => {
    const amount = parseFloat(currentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
    setPayments([...payments, { method: currentMethod!, amount }]);
    setCurrentAmount('');
  };

  const payFull = (method: PaymentMethod) => {
    if (!splitMode) { setPayments([{ method, amount: total }]); setCurrentMethod(method); }
  };

  const handleFinalize = async () => {
    if (isSubmitting) return;
    if (!guardCaixa()) return;
    if (totalPaid < total) { toast.error('Pagamento insuficiente'); return; }
    if (deliveryMode === 'entrega') {
      if (!deliveryAddress.street.trim() || !deliveryAddress.neighborhood.trim()) {
        toast.error('Preencha Rua e Bairro para entrega');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const sale = await finalizeSale(
        payments, change, customerName.trim(), customerContact.trim(), [],
        deliveryMode,
        deliveryMode === 'entrega' ? deliveryAddress : undefined,
        deliveryMode === 'entrega' ? parseCurrency(deliveryFeeInput) : 0
      );
      setLastSale(sale);
      setPayments([]); setShowPayment(false); setSplitMode(false); setCurrentMethod(null);
      setCustomerName(''); setCustomerContact('');
      setDeliveryMode('retirada');
      setDeliveryAddress({ name: '', phone: '', cep: '', street: '', number: '', neighborhood: '', complement: '', reference: '' });
      setDeliveryFeeInput('');
      setShowReceiptConfirm(true);
    } catch (e) {
      toast.error('Erro ao finalizar venda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addObservation = (itemId: string) => {
    if (!obsInput.trim()) return;
    const item = cart.find((i) => i.id === itemId);
    if (item) {
      updateCartItem(itemId, { observations: [...item.observations, obsInput.trim()] });
      setObsInput(''); setEditingObsId(null);
    }
  };

  const removeObservation = (itemId: string, obsIndex: number) => {
    const item = cart.find((i) => i.id === itemId);
    if (item) updateCartItem(itemId, { observations: item.observations.filter((_, i) => i !== obsIndex) });
  };

  const getItemLabel = (item: typeof cart[0]) => {
    let label = item.product.name;
    if (item.pizzaSize) label = `Pizza ${item.pizzaSize} ${label}`;
    if (item.secondFlavor) label += ` / ${item.secondFlavor.name}`;
    return label;
  };

  if (cart.length === 0 && !showReceiptConfirm) {
    return (
      <div className="w-80 glass-card p-4 flex flex-col items-center justify-center gap-2 shrink-0">
        <span className="text-4xl">🛒</span>
        <p className="text-muted-foreground text-sm">Carrinho vazio</p>
        <p className="text-muted-foreground text-xs">Clique em um produto para adicionar</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 glass-card flex flex-col shrink-0 animate-slide-in-right">
        <div className="p-3 border-b border-border">
          <h2 className="font-bold text-sm text-foreground">Carrinho ({cart.reduce((s, i) => s + i.quantity, 0)} itens)</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[30vh]">
          {cart.map((item) => (
            <div key={item.id} className="bg-secondary rounded-lg p-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.product.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{getItemLabel(item)}</p>
                  {item.border && (
                    <p className="text-[10px] text-muted-foreground">
                      Borda: {item.border.name} {item.borderFree ? '(Grátis)' : `+${formatCurrency(item.border.price)}`}
                    </p>
                  )}
                  <p className="text-primary text-xs font-bold">{formatCurrency(item.calculatedPrice * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditingObsId(editingObsId === item.id ? null : item.id)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {item.observations.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.observations.map((obs, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-warning">
                      <span>• {obs}</span>
                      <button onClick={() => removeObservation(item.id, i)} className="text-destructive hover:text-destructive/80">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {editingObsId === item.id && (
                <div className="flex gap-1 mt-1">
                  <Input value={obsInput} onChange={(e) => setObsInput(e.target.value)} placeholder="Observação..." className="bg-muted border-border h-7 text-xs" onKeyDown={(e) => e.key === 'Enter' && addObservation(item.id)} />
                  <Button size="sm" onClick={() => addObservation(item.id)} className="h-7 text-xs px-2">+</Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3 space-y-3">
          {deliveryFeeValue > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalProducts)}</span>
            </div>
          )}
          {deliveryFeeValue > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Taxa de Entrega</span>
              <span>{formatCurrency(deliveryFeeValue)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          {!showPayment ? (
            <div className="flex gap-2">
              <Button onClick={() => { if (guardCaixa()) setShowPayment(true); }} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                Pagamento
              </Button>
              <Button onClick={clearCart} variant="outline" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in max-h-[40vh] overflow-y-auto pr-1">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente (opcional)" className="bg-secondary border-border h-8 text-xs" />
              <Input
                value={customerContact}
                onChange={(e) => setCustomerContact(maskPhone(e.target.value))}
                placeholder="Telefone (99) 99999-9999"
                className="bg-secondary border-border h-8 text-xs"
              />

              {/* Delivery / Pickup toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDeliveryMode('retirada')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    deliveryMode === 'retirada' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" /> Retirada
                </button>
                <button
                  onClick={() => setDeliveryMode('entrega')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    deliveryMode === 'entrega' ? 'bg-info/10 text-info border-info/30' : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Entrega
                </button>
              </div>

              {/* Address fields for delivery */}
              {deliveryMode === 'entrega' && (
                <div className="space-y-2 bg-secondary/50 border border-border rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Endereço de Entrega</p>
                  <Input
                    value={deliveryAddress.name || ''}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, name: e.target.value })}
                    placeholder="Nome (opcional)"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <Input
                    value={deliveryAddress.phone}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: maskPhone(e.target.value) })}
                    placeholder="Telefone (opcional)"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <Input
                    value={deliveryAddress.cep}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, cep: maskCEP(e.target.value) })}
                    placeholder="CEP"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <Input
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                    placeholder="Rua * (obrigatório)"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={deliveryAddress.number}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, number: e.target.value.replace(/\D/g, '') })}
                      placeholder="Nº"
                      className="bg-card border-border h-7 text-xs w-20"
                    />
                    <Input
                      value={deliveryAddress.neighborhood}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, neighborhood: e.target.value })}
                      placeholder="Bairro *"
                      className="bg-card border-border h-7 text-xs flex-1"
                    />
                  </div>
                  <Input
                    value={deliveryAddress.complement || ''}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, complement: e.target.value })}
                    placeholder="Complemento"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <Input
                    value={deliveryAddress.reference || ''}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, reference: e.target.value })}
                    placeholder="Referência"
                    className="bg-card border-border h-7 text-xs"
                  />
                  <Input
                    value={deliveryFeeInput}
                    onChange={(e) => setDeliveryFeeInput(maskCurrency(e.target.value))}
                    placeholder="R$ 0,00"
                    className="bg-card border-border h-7 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Taxa de entrega</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSplitMode(!splitMode); setPayments([]); }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${splitMode ? 'bg-info text-info-foreground' : 'bg-secondary text-muted-foreground'}`}
                >
                  Dividir Pagamento
                </button>
              </div>

              {payments.length > 0 && (
                <div className="space-y-1">
                  {payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-success/10 rounded px-2 py-1 text-xs">
                      <span className="capitalize">{PAYMENT_METHODS.find(m => m.method === p.method)?.label || p.method}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-success font-medium">{formatCurrency(p.amount)}</span>
                        {splitMode && (
                          <button onClick={() => setPayments(payments.filter((_, j) => j !== i))} className="text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(splitMode ? remaining > 0 : payments.length === 0) && (
                <>
                  <div className="grid grid-cols-2 gap-1">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.method}
                        onClick={() => { setCurrentMethod(pm.method); if (!splitMode) payFull(pm.method); }}
                        className={`flex items-center justify-center gap-1 py-2 rounded text-xs font-medium transition-colors ${
                          currentMethod === pm.method ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <span>{pm.icon}</span>
                        {pm.label}
                      </button>
                    ))}
                  </div>
                  {splitMode && currentMethod && (
                    <div className="flex gap-2">
                      <Input type="number" placeholder={`Restante: ${formatCurrency(remaining)}`} value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
                      <Button onClick={addPayment} variant="outline" size="sm" className="h-8">+</Button>
                    </div>
                  )}
                </>
              )}

              {remaining <= 0 && change > 0 && (
                <div className="flex justify-between text-warning font-bold text-sm bg-warning/10 rounded px-2 py-1">
                  <span>Troco</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleFinalize}
                  disabled={totalPaid < total || isSubmitting}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Finalizando...' : 'Finalizar Venda'}
                </Button>
                <Button onClick={() => { setShowPayment(false); setPayments([]); setSplitMode(false); setCurrentMethod(null); }} variant="outline" size="sm">
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReceiptDialog sale={lastSale} open={showReceiptConfirm} onOpenChange={setShowReceiptConfirm} />
    </>
  );
}
