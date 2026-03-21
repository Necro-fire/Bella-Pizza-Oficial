import { ProductGrid } from '@/components/pdv/ProductGrid';
import { Cart } from '@/components/pdv/Cart';

export default function PDV() {
  return (
    <div className="flex gap-4 p-4 h-[calc(100vh-3.5rem)] overflow-hidden">
      <ProductGrid />
      <Cart />
    </div>
  );
}
