import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Sale, CashRegister, CashMovement, UserRole, PaymentSplit } from '@/types/pizzaria';

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Pizza Margherita', category: 'pizza', image: '🍕', price: 39.90, cost: 12.00, active: true },
  { id: '2', name: 'Pizza Calabresa', category: 'pizza', image: '🍕', price: 42.90, cost: 14.00, active: true },
  { id: '3', name: 'Pizza 4 Queijos', category: 'pizza', image: '🍕', price: 45.90, cost: 16.00, active: true },
  { id: '4', name: 'Pizza Portuguesa', category: 'pizza', image: '🍕', price: 44.90, cost: 15.00, active: true },
  { id: '5', name: 'Pizza Frango c/ Catupiry', category: 'pizza', image: '🍕', price: 43.90, cost: 14.50, active: true },
  { id: '6', name: 'Pizza Pepperoni', category: 'pizza', image: '🍕', price: 46.90, cost: 16.50, active: true },
  { id: '7', name: 'Coca-Cola 2L', category: 'bebidas', image: '🥤', price: 12.00, cost: 6.00, active: true },
  { id: '8', name: 'Guaraná 2L', category: 'bebidas', image: '🥤', price: 10.00, cost: 5.00, active: true },
  { id: '9', name: 'Suco Natural', category: 'bebidas', image: '🧃', price: 8.00, cost: 3.00, active: true },
  { id: '10', name: 'Água Mineral', category: 'bebidas', image: '💧', price: 4.00, cost: 1.50, active: true },
  { id: '11', name: 'Borda Recheada', category: 'outros', image: '🧀', price: 8.00, cost: 3.00, active: true },
  { id: '12', name: 'Molho Extra', category: 'outros', image: '🫙', price: 3.00, cost: 0.80, active: true },
];

interface AppState {
  // Auth
  userRole: UserRole;
  pinUnlocked: boolean;
  adminPin: string;
  setUserRole: (role: UserRole) => void;
  unlockPin: (pin: string) => boolean;
  lockPin: () => void;
  setAdminPin: (pin: string) => void;

  // Products
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  // Sales
  sales: Sale[];
  finalizeSale: (payments: PaymentSplit[], change: number) => void;

  // Cash register
  cashRegister: CashRegister | null;
  openRegister: (initialAmount: number) => void;
  closeRegister: () => void;
  addMovement: (m: Omit<CashMovement, 'id' | 'date'>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      userRole: 'admin',
      pinUnlocked: false,
      adminPin: '1234',
      setUserRole: (role) => set({ userRole: role, pinUnlocked: false }),
      unlockPin: (pin) => {
        if (pin === get().adminPin) {
          set({ pinUnlocked: true });
          return true;
        }
        return false;
      },
      lockPin: () => set({ pinUnlocked: false }),
      setAdminPin: (pin) => set({ adminPin: pin }),

      products: DEMO_PRODUCTS,
      addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
      updateProduct: (p) => set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),

      cart: [],
      addToCart: (product) =>
        set((s) => {
          const existing = s.cart.find((i) => i.product.id === product.id);
          if (existing) {
            return { cart: s.cart.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)) };
          }
          return { cart: [...s.cart, { product, quantity: 1 }] };
        }),
      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((i) => i.product.id !== productId) })),
      updateCartQty: (productId, qty) =>
        set((s) => {
          if (qty <= 0) return { cart: s.cart.filter((i) => i.product.id !== productId) };
          return { cart: s.cart.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)) };
        }),
      clearCart: () => set({ cart: [] }),

      sales: [],
      finalizeSale: (payments, change) =>
        set((s) => {
          const total = s.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
          const sale: Sale = {
            id: crypto.randomUUID(),
            items: [...s.cart],
            payments,
            total,
            change,
            date: new Date().toISOString(),
          };
          const reg = s.cashRegister;
          return {
            sales: [...s.sales, sale],
            cart: [],
            cashRegister: reg ? { ...reg, sales: [...reg.sales, sale] } : reg,
          };
        }),

      cashRegister: null,
      openRegister: (initialAmount) =>
        set({
          cashRegister: {
            id: crypto.randomUUID(),
            openedAt: new Date().toISOString(),
            initialAmount,
            sales: [],
            entries: [],
            exits: [],
          },
        }),
      closeRegister: () =>
        set((s) => ({
          cashRegister: s.cashRegister ? { ...s.cashRegister, closedAt: new Date().toISOString() } : null,
        })),
      addMovement: (m) =>
        set((s) => {
          if (!s.cashRegister) return {};
          const movement: CashMovement = { ...m, id: crypto.randomUUID(), date: new Date().toISOString() };
          if (m.type === 'entry') {
            return { cashRegister: { ...s.cashRegister, entries: [...s.cashRegister.entries, movement] } };
          }
          return { cashRegister: { ...s.cashRegister, exits: [...s.cashRegister.exits, movement] } };
        }),
    }),
    { name: 'pizzaria-store' }
  )
);
