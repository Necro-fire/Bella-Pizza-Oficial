import { useState } from 'react';
import { Minus, Plus, Trash2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { PaymentMethod, PaymentSplit } from '@/types/pizzaria';
import { toast } from 'sonner';

const paymentMethods: { method: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { method: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { method: 'pix', label: 'Pix', icon: Smartphone },
  { method: 'cartao', label: 'Cartão', icon: CreditCard },
];

export function Cart() {
  const { cart, updateCartQty, removeFromCart, clearCart, finalizeSale, cashRegister } = useStore();
  const [showPayment, setShowPayment] = useState(false);
  const [payments, setPayments] = useState<PaymentSplit[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('dinheiro');
  const [currentAmount, setCurrentAmount] = useState('');

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  const addPayment = () => {
    const amount = parseFloat(currentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    setPayments([...payments, { method: currentMethod, amount }]);
    setCurrentAmount('');
  };

  const removePayment = (idx: number) => {
    setPayments(payments.filter((_, i) => i !== idx));
  };

  const handleFinalize = () => {
    if (!cashRegister) {
      toast.error('Abra o caixa antes de vender');
      return;
    }
    if (cashRegister.closedAt) {
      toast.error('O caixa está fechado');
      return;
    }
    if (totalPaid < total) {
      toast.error('Pagamento insuficiente');
      return;
    }
    finalizeSale(payments, change);
    setPayments([]);
    setShowPayment(false);
    toast.success('Venda finalizada!');
  };

  if (cart.length === 0) {
    return (
      <div className="w-80 glass-card p-4 flex flex-col items-center justify-center gap-2 shrink-0">
        <span className="text-4xl">🛒</span>
        <p className="text-muted-foreground text-sm">Carrinho vazio</p>
        <p className="text-muted-foreground text-xs">Clique em um produto para adicionar</p>
      </div>
    );
  }

  return (
    <div className="w-80 glass-card flex flex-col shrink-0 animate-slide-in-right">
      <div className="p-3 border-b border-border">
        <h2 className="font-bold text-sm">Carrinho ({cart.reduce((s, i) => s + i.quantity, 0)} itens)</h2>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[40vh]">
        {cart.map((item) => (
          <div key={item.product.id} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
            <span className="text-xl">{item.product.image}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.product.name}</p>
              <p className="text-primary text-xs font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
              <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors active:scale-95">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment section */}
      <div className="border-t border-border p-3 space-y-3">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">R$ {total.toFixed(2)}</span>
        </div>

        {!showPayment ? (
          <div className="flex gap-2">
            <Button onClick={() => setShowPayment(true)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              Pagamento
            </Button>
            <Button onClick={clearCart} variant="outline" size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {/* Payments added */}
            {payments.length > 0 && (
              <div className="space-y-1">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-success/10 rounded px-2 py-1 text-sm">
                    <span className="capitalize">{p.method}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-success font-medium">R$ {p.amount.toFixed(2)}</span>
                      <button onClick={() => removePayment(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add payment */}
            {remaining > 0 && (
              <>
                <div className="flex gap-1">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.method}
                      onClick={() => setCurrentMethod(pm.method)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-medium transition-colors ${
                        currentMethod === pm.method ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      <pm.icon className="w-3 h-3" />
                      {pm.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Restante: R$ ${remaining.toFixed(2)}`}
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <Button onClick={addPayment} variant="outline" size="sm">
                    +
                  </Button>
                </div>
              </>
            )}

            {remaining <= 0 && change > 0 && (
              <div className="flex justify-between text-warning font-bold text-sm bg-warning/10 rounded px-2 py-1">
                <span>Troco</span>
                <span>R$ {change.toFixed(2)}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleFinalize}
                disabled={totalPaid < total}
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold disabled:opacity-50"
              >
                Finalizar Venda
              </Button>
              <Button onClick={() => { setShowPayment(false); setPayments([]); }} variant="outline" size="sm">
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
