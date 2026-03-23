import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Sale, CashRegister, CashMovement, UserRole, PaymentSplit, AuditLog, MovementType } from '@/types/pizzaria';

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
  cashHistory: CashRegister[];
  openRegister: (initialAmount: number) => void;
  closeRegister: (informedAmount?: number) => void;
  addMovement: (m: Omit<CashMovement, 'id' | 'date'>) => void;
  deleteMovement: (movementId: string) => void;

  // Audit logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string, details: string) => void;
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
          get().addAuditLog('PIN_UNLOCK', 'PIN administrativo desbloqueado');
          return true;
        }
        get().addAuditLog('PIN_FAIL', 'Tentativa de PIN incorreto');
        return false;
      },
      lockPin: () => set({ pinUnlocked: false }),
      setAdminPin: (pin) => set({ adminPin: pin }),

      products: DEMO_PRODUCTS,
      addProduct: (p) => {
        set((s) => ({ products: [...s.products, p] }));
        get().addAuditLog('PRODUCT_ADD', `Produto criado: ${p.name}`);
      },
      updateProduct: (p) => {
        set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) }));
        get().addAuditLog('PRODUCT_UPDATE', `Produto atualizado: ${p.name}`);
      },
      deleteProduct: (id) => {
        const product = get().products.find(p => p.id === id);
        set((s) => ({ products: s.products.filter((x) => x.id !== id) }));
        get().addAuditLog('PRODUCT_DELETE', `Produto removido: ${product?.name || id}`);
      },

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
      cashHistory: [],
      openRegister: (initialAmount) => {
        set({
          cashRegister: {
            id: crypto.randomUUID(),
            openedAt: new Date().toISOString(),
            initialAmount,
            sales: [],
            entries: [],
            exits: [],
          },
        });
        get().addAuditLog('REGISTER_OPEN', `Caixa aberto com saldo inicial: R$ ${initialAmount.toFixed(2)}`);
      },
      closeRegister: (informedAmount) =>
        set((s) => {
          if (!s.cashRegister) return {};
          const closed = {
            ...s.cashRegister,
            closedAt: new Date().toISOString(),
            informedAmount,
          };
          get().addAuditLog('REGISTER_CLOSE', `Caixa fechado. Valor informado: R$ ${informedAmount?.toFixed(2) || 'N/A'}`);
          return {
            cashRegister: closed,
            cashHistory: [...s.cashHistory, closed],
          };
        }),
      addMovement: (m) =>
        set((s) => {
          if (!s.cashRegister) return {};
          const movement: CashMovement = { ...m, id: crypto.randomUUID(), date: new Date().toISOString() };
          const isEntry = m.type === 'entry' || m.type === 'reforco';
          if (isEntry) {
            return { cashRegister: { ...s.cashRegister, entries: [...s.cashRegister.entries, movement] } };
          }
          return { cashRegister: { ...s.cashRegister, exits: [...s.cashRegister.exits, movement] } };
        }),
      deleteMovement: (movementId) =>
        set((s) => {
          if (!s.cashRegister) return {};
          get().addAuditLog('MOVEMENT_DELETE', `Movimentação removida: ${movementId.slice(0, 8)}`);
          return {
            cashRegister: {
              ...s.cashRegister,
              entries: s.cashRegister.entries.filter(e => e.id !== movementId),
              exits: s.cashRegister.exits.filter(e => e.id !== movementId),
            },
          };
        }),

      auditLogs: [],
      addAuditLog: (action, details) =>
        set((s) => ({
          auditLogs: [
            {
              id: crypto.randomUUID(),
              action,
              details,
              user: s.userRole,
              date: new Date().toISOString(),
            },
            ...s.auditLogs,
          ].slice(0, 500),
        })),
    }),
    { name: 'pizzaria-store' }
  )
);
