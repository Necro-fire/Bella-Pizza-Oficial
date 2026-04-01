import { useState, useEffect, useRef } from 'react';
import { ProductGrid } from '@/components/pdv/ProductGrid';
import { Cart } from '@/components/pdv/Cart';
import { PizzaBuilder } from '@/components/pdv/PizzaBuilder';
import { useStore } from '@/store/useStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function PDV() {
  const { cashRegister, cart, openRegister } = useStore();
  const [pizzaBuilderOpen, setPizzaBuilderOpen] = useState(false);
  const [selectedPizzaId, setSelectedPizzaId] = useState<string | undefined>();
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  const isOpen = cashRegister && !cashRegister.closedAt;

  const handlePizzaClick = (productId: string) => {
    setSelectedPizzaId(productId);
    setPizzaBuilderOpen(true);
  };

  const handleOpenRegister = async () => {
    const amount = parseFloat(initialAmount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      toast.error('Informe um valor válido');
      return;
    }
    await openRegister(amount);
    setInitialAmount('');
    setShowOpenDialog(false);
    toast.success('Caixa aberto!');
  };

  // Show alert only when: cart has items AND register is closed
  const showAlert = !isOpen && cart.length > 0;

  return (
    <div className="flex gap-4 p-4 h-[calc(100vh-3.5rem)] overflow-hidden relative">
      {/* Alert: only when cart has items + register closed */}
      {showAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-card border-destructive/50 px-5 py-3 shadow-xl animate-fade-in flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold">Caixa fechado</p>
            <p className="text-xs text-muted-foreground">Abra o caixa para finalizar vendas</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowOpenDialog(true)}
            className="bg-success hover:bg-success/90 text-success-foreground font-bold ml-2 shrink-0"
          >
            Abrir Caixa
          </Button>
        </div>
      )}

      {/* Open register dialog */}
      {showOpenDialog && (
        <div className="absolute inset-0 z-30 bg-background/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowOpenDialog(false)}>
          <div className="glass-card p-6 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Abrir Caixa</h3>
            <p className="text-sm text-muted-foreground mb-4">Informe o valor inicial do caixa</p>
            <Input
              type="text"
              inputMode="decimal"
              value={initialAmount}
              onChange={e => setInitialAmount(e.target.value.replace(/[^\d,.]/, ''))}
              placeholder="R$ 0,00"
              className="bg-secondary border-border h-11 text-lg mb-3"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleOpenRegister()}
            />
            <div className="flex gap-2">
              <Button onClick={handleOpenRegister} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold h-10">
                Confirmar
              </Button>
              <Button onClick={() => setShowOpenDialog(false)} variant="outline" className="h-10">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductGrid onPizzaClick={handlePizzaClick} />
      <Cart />
      <PizzaBuilder
        open={pizzaBuilderOpen}
        onClose={() => { setPizzaBuilderOpen(false); setSelectedPizzaId(undefined); }}
        initialFlavorId={selectedPizzaId}
      />
    </div>
  );
}
