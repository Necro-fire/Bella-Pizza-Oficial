import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { Category } from '@/types/pizzaria';

const categories: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pizza', label: '🍕 Pizzas' },
  { value: 'bebidas', label: '🥤 Bebidas' },
  { value: 'outros', label: '📦 Outros' },
];

export function ProductGrid() {
  const { products, addToCart } = useStore();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return products
      .filter((p) => p.active)
      .filter((p) => category === 'all' || p.category === category)
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, category, search]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-1">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === c.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1">
        {filtered.map((product, i) => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            className="glass-card p-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.97] animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-4xl">{product.image}</span>
            <span className="text-sm font-medium text-center leading-tight">{product.name}</span>
            <span className="text-primary font-bold text-lg">
              R$ {product.price.toFixed(2)}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Nenhum produto encontrado
          </div>
        )}
      </div>
    </div>
  );
}
