import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { PizzaSize, PIZZA_SIZES, PIZZA_TYPES, Product, PizzaType, PizzaBorder } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { Check, Gift, AlertCircle } from 'lucide-react';

interface PizzaBuilderProps {
  open: boolean;
  onClose: () => void;
  initialFlavorId?: string;
}

type BuilderCategory = 'all' | PizzaType | 'bordas';

export function PizzaBuilder({ open, onClose, initialFlavorId }: PizzaBuilderProps) {
  const { products, addToCart, borders, freeBorderRules, freeSodaRules, sodaProducts } = useStore();
  const pizzas = products.filter((p) => p.category === 'pizza' && p.active);

  const [size, setSize] = useState<PizzaSize>('G');
  const [flavor1Id, setFlavor1Id] = useState(initialFlavorId || '');
  const [flavor2Id, setFlavor2Id] = useState('');
  const [twoFlavors, setTwoFlavors] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<BuilderCategory>('all');
  const [selectedBorderId, setSelectedBorderId] = useState<string | null>(null);
  const [noBorder, setNoBorder] = useState(true);
  const [selectedSodaId, setSelectedSodaId] = useState<string | null>(null);

  const flavor1 = pizzas.find((p) => p.id === flavor1Id);
  const flavor2 = pizzas.find((p) => p.id === flavor2Id);
  const selectedBorder = borders.find(b => b.id === selectedBorderId && b.active);
  const selectedSoda = sodaProducts.find(s => s.id === selectedSodaId);

  // Check free rules
  const isBorderFreeForSize = useMemo(() => {
    const rule = freeBorderRules.find(r => r.size === size);
    return rule?.enabled ?? false;
  }, [freeBorderRules, size]);

  const isSodaFreeForSize = useMemo(() => {
    const rule = freeSodaRules.find(r => r.size === size);
    return rule?.enabled ?? false;
  }, [freeSodaRules, size]);

  const isBorderFree = (border: PizzaBorder) => {
    return isBorderFreeForSize || border.freeSizes.includes(size);
  };

  const getPrice = (product: Product, sz: PizzaSize) => product.pizzaPrices?.[sz] || 0;

  const calculatePrice = () => {
    if (!flavor1) return 0;
    const p1 = getPrice(flavor1, size);
    let total = p1;
    if (twoFlavors && flavor2) {
      const p2 = getPrice(flavor2, size);
      total = p1 / 2 + p2 / 2;
    }
    // Add border price if not free
    if (!noBorder && selectedBorder) {
      if (!isBorderFree(selectedBorder)) {
        total += selectedBorder.price;
      }
    }
    return total;
  };

  const filteredPizzas = categoryFilter === 'all' || categoryFilter === 'bordas'
    ? pizzas
    : pizzas.filter((p) => p.pizzaType === categoryFilter);

  const activeBorders = borders.filter(b => b.active);

  const handleAdd = () => {
    if (!flavor1) return;
    if (isSodaFreeForSize && !selectedSodaId) return; // must select soda

    const price = calculatePrice();
    const border = !noBorder && selectedBorder ? selectedBorder : undefined;
    const borderIsFree = border ? isBorderFree(border) : false;
    const freeSoda = isSodaFreeForSize && selectedSoda ? selectedSoda : undefined;

    addToCart({
      id: crypto.randomUUID(),
      product: flavor1,
      quantity: 1,
      observations: [],
      pizzaSize: size,
      secondFlavor: twoFlavors ? flavor2 : undefined,
      calculatedPrice: price,
      border,
      borderFree: borderIsFree,
      freeSoda,
    });

    // Add free soda as separate cart item with price 0
    if (freeSoda) {
      addToCart({
        id: crypto.randomUUID(),
        product: { id: freeSoda.id, name: `${freeSoda.name} (Grátis)`, category: 'bebida' as const, icon: freeSoda.icon, price: 0, cost: freeSoda.cost, active: true },
        quantity: 1,
        observations: ['Refrigerante grátis - Pizza ' + size],
        calculatedPrice: 0,
      });
    }

    onClose();
    resetState();
  };

  const resetState = () => {
    setSize('G');
    setFlavor1Id('');
    setFlavor2Id('');
    setTwoFlavors(false);
    setCategoryFilter('all');
    setSelectedBorderId(null);
    setNoBorder(true);
    setSelectedSodaId(null);
  };

  useEffect(() => {
    if (initialFlavorId && open) setFlavor1Id(initialFlavorId);
  }, [initialFlavorId, open]);

  const FlavorCard = ({ product, selected, onClick }: { product: Product; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-lg transition-all border ${
        selected
          ? 'bg-primary/10 border-primary text-foreground shadow-sm'
          : 'bg-card border-border text-foreground hover:bg-accent hover:border-accent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">{product.name}</span>
        <span className={`text-xs font-bold whitespace-nowrap ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
          {formatCurrency(getPrice(product, size))}
        </span>
      </div>
      {product.pizzaType && (
        <span className="text-[10px] text-muted-foreground capitalize">{product.pizzaType}</span>
      )}
    </button>
  );

  const categories: { value: BuilderCategory; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'tradicional', label: 'Tradicional' },
    { value: 'especial1', label: 'Especial 1' },
    { value: 'especial2', label: 'Especial 2' },
    { value: 'doce', label: '🍫 Doce' },
    { value: 'bordas', label: '🧀 Bordas' },
  ];

  const isDoce = flavor1?.pizzaType === 'doce';
  const showBordasTab = categoryFilter === 'bordas' && !isDoce;

  const showBordas = showBordasTab;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetState(); } }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">🍕 Montar Pizza</DialogTitle>
        </DialogHeader>

        {/* Size */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Tamanho</label>
            <div className="grid grid-cols-4 gap-2">
            {PIZZA_SIZES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all border ${
                  size === s.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {s.value}
                <span className="block text-[10px] font-normal">{s.label}</span>
              </button>
            ))}
          </div>
          {/* Free indicators */}
          <div className="flex gap-2 mt-2">
            {isBorderFreeForSize && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full font-medium">
                <Gift className="w-3 h-3" /> Borda grátis
              </span>
            )}
            {isSodaFreeForSize && (
              <span className="inline-flex items-center gap-1 text-[10px] text-info bg-info/10 px-2 py-0.5 rounded-full font-medium">
                <Gift className="w-3 h-3" /> Refrigerante 1L grátis
              </span>
            )}
          </div>
        </div>

        {/* 2 flavors toggle */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Sabores:</label>
          <button
            onClick={() => { setTwoFlavors(false); setFlavor2Id(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${!twoFlavors ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
          >
            1 Sabor
          </button>
          <button
            onClick={() => setTwoFlavors(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${twoFlavors ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
          >
            2 Sabores
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                categoryFilter === c.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Flavors or Borders */}
        {showBordas ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Escolha a Borda</label>
            <div className="space-y-1.5">
              {/* No border option */}
              <button
                onClick={() => { setNoBorder(true); setSelectedBorderId(null); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                  noBorder
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Sem Borda</span>
                  {noBorder && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
              {activeBorders.map((border) => {
                const free = isBorderFree(border);
                const selected = !noBorder && selectedBorderId === border.id;
                return (
                  <button
                    key={border.id}
                    onClick={() => { setNoBorder(false); setSelectedBorderId(border.id); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                      selected
                        ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                        : 'bg-card border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold">{border.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{formatCurrency(border.price)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {free ? (
                          <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Gift className="w-3 h-3" /> Grátis
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary">+ {formatCurrency(border.price)}</span>
                        )}
                        {selected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : twoFlavors ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">1º Sabor</label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredPizzas.map((p) => (
                  <FlavorCard key={p.id} product={p} selected={flavor1Id === p.id} onClick={() => setFlavor1Id(p.id)} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">2º Sabor</label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredPizzas.filter((p) => p.id !== flavor1Id).map((p) => (
                  <FlavorCard key={p.id} product={p} selected={flavor2Id === p.id} onClick={() => setFlavor2Id(p.id)} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Sabor</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {filteredPizzas.map((p) => (
                <FlavorCard key={p.id} product={p} selected={flavor1Id === p.id} onClick={() => setFlavor1Id(p.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Free Soda Selection */}
        {isSodaFreeForSize && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <Gift className="w-3 h-3 text-info" /> Refrigerante 1L Grátis
              <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {sodaProducts.filter(s => s.active).map(soda => (
                <button
                  key={soda.id}
                  onClick={() => setSelectedSodaId(soda.id)}
                  className={`text-left px-3 py-2 rounded-lg transition-all border ${
                    selectedSodaId === soda.id
                      ? 'bg-info/10 border-info text-foreground'
                      : 'bg-card border-border text-foreground hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{soda.icon} {soda.name}</span>
                    {selectedSodaId === soda.id && <Check className="w-3.5 h-3.5 text-info" />}
                  </div>
                </button>
              ))}
            </div>
            {!selectedSodaId && (
              <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Selecione o refrigerante grátis para continuar
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pizza {size}</span>
            <span className="text-lg font-extrabold text-primary">{formatCurrency(calculatePrice())}</span>
          </div>
          {flavor1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {flavor1.name}
              {!twoFlavors && <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(getPrice(flavor1, size))}</span>}
            </div>
          )}
          {twoFlavors && flavor2 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-info" />
              {flavor2.name}
            </div>
          )}
          {!noBorder && selectedBorder && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Borda: {selectedBorder.name}
              <span className={`text-xs ml-auto font-bold ${isBorderFree(selectedBorder) ? 'text-success' : 'text-primary'}`}>
                {isBorderFree(selectedBorder) ? 'R$ 0,00' : `+ ${formatCurrency(selectedBorder.price)}`}
              </span>
            </div>
          )}
          {isSodaFreeForSize && selectedSoda && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-info" />
              🥤 {selectedSoda.name}
              <span className="text-xs ml-auto font-bold text-success">Grátis</span>
            </div>
          )}
          {twoFlavors && flavor1 && flavor2 && (
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2 mt-1">
              ({formatCurrency(getPrice(flavor1, size))} ÷ 2) + ({formatCurrency(getPrice(flavor2, size))} ÷ 2) = {formatCurrency(getPrice(flavor1, size) / 2 + getPrice(flavor2, size) / 2)}
            </p>
          )}
        </div>

        <Button
          onClick={handleAdd}
          disabled={!flavor1 || (twoFlavors && !flavor2) || (isSodaFreeForSize && !selectedSodaId)}
          className="w-full bg-primary hover:bg-primary/90 font-bold text-sm h-11"
        >
          Adicionar ao Carrinho
        </Button>
      </DialogContent>
    </Dialog>
  );
}
