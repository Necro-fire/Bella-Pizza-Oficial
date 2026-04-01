import { useState, useMemo } from 'react';
import { Search, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { Category, CATEGORIES } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface ProductGridProps {
  onPizzaClick?: (productId: string) => void;
}

export function ProductGrid({ onPizzaClick }: ProductGridProps) {
  const { products, addToCart, cashRegister } = useStore();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const isOpen = cashRegister && !cashRegister.closedAt;

  const filtered = useMemo(() => {
    return products
      .filter((p) => p.active)
      .filter((p) => category === 'all' || p.category === category)
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, category, search]);

  const handleClick = (product: typeof products[0]) => {
    if (!isOpen) {
      toast.error('Caixa fechado. Abra o caixa para continuar.');
      return;
    }
    if (product.category === 'pizza' && onPizzaClick) {
      onPizzaClick(product.id);
      return;
    }
    addToCart({ id: crypto.randomUUID(), product, quantity: 1, observations: [], calculatedPrice: product.price });
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Todos</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              <span>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      {!isOpen && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <Lock className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive font-medium">Caixa fechado. Abra o caixa para adicionar produtos.</p>
        </div>
      )}

      <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto flex-1 ${!isOpen ? 'opacity-50 pointer-events-none' : ''}`}>
        {filtered.map((product) => (
          <button key={product.id} onClick={() => handleClick(product)} className="glass-card p-3 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-all active:scale-95 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{product.icon}</span>
            <span className="text-xs font-medium text-center leading-tight line-clamp-2">{product.name}</span>
            {product.category === 'pizza' ? (
              <span className="text-[10px] text-primary font-bold">A partir de {formatCurrency(product.pizzaPrices?.P || 0)}</span>
            ) : (
              <span className="text-xs text-primary font-bold">{formatCurrency(product.price)}</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">Nenhum produto encontrado</div>}
      </div>
    </div>
  );
}
