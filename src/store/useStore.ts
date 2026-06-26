import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Product, CartItem, Sale, CashRegister, CashMovement, PaymentSplit, AuditLog, PizzaSize, PizzaBorder, FreeBorderRule, FreeSodaRule, PizzaType, Category, SodaProduct } from '@/types/pizzaria';

// Helper to map DB row to Product
const mapProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  category: row.category as Category,
  icon: row.icon || '📦',
  price: Number(row.price) || 0,
  cost: Number(row.cost) || 0,
  active: row.active ?? true,
  pizzaType: row.pizza_type as PizzaType | undefined,
  pizzaPrices: row.pizza_prices as Record<PizzaSize, number> | undefined,
  pizzaCosts: row.pizza_costs as Record<PizzaSize, number> | undefined,
  observations: row.observations || [],
});

const mapBorder = (row: any): PizzaBorder => ({
  id: row.id,
  name: row.name,
  price: Number(row.price) || 0,
  cost: Number(row.cost) || 0,
  active: row.active ?? true,
  freeSizes: (row.free_sizes || []) as PizzaSize[],
});

const mapSodaProduct = (row: any): SodaProduct => ({
  id: row.id,
  name: row.name,
  size: row.size || '1L',
  icon: row.icon || '🥤',
  price: Number(row.price) || 0,
  cost: Number(row.cost) || 0,
  active: row.active ?? true,
  freeSizes: (row.free_sizes || []) as PizzaSize[],
});

export function resolveRegisterSales<T extends { register_id?: string | null }>(registerId: string | null | undefined, salesRows: T[] = [], includeUnlinked = false): T[] {
  if (!registerId) return [];

  return salesRows.filter((sale) => {
    const linkedRegisterId = sale.register_id ?? null;
    return linkedRegisterId === registerId || (includeUnlinked && linkedRegisterId === null);
  });
}

interface AppState {
  // Data from DB
  products: Product[];
  borders: PizzaBorder[];
  sodaProducts: SodaProduct[];
  freeBorderRules: FreeBorderRule[];
  freeSodaRules: FreeSodaRule[];
  sales: Sale[];
  cashRegister: CashRegister | null;
  cashHistory: CashRegister[];
  auditLogs: AuditLog[];
  // nextSaleCode removed - now generated atomically in the database
  loading: boolean;

  // Local-only state
  cart: CartItem[];

  // Init
  fetchAll: () => Promise<void>;

  // Products
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Cart (local)
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;

  // Sales
  finalizeSale: (payments: PaymentSplit[], change: number, customerName: string, customerContact: string, observations: string[], deliveryMode?: import('@/types/pizzaria').DeliveryMode, deliveryAddress?: import('@/types/pizzaria').DeliveryAddress, deliveryFee?: number) => Promise<Sale>;
  cancelSale: (saleId: string) => Promise<void>;

  // Cash
  openRegister: (initialAmount: number) => Promise<void>;
  closeRegister: (informedAmount?: number) => Promise<void>;
  addMovement: (m: Omit<CashMovement, 'id' | 'date'>) => Promise<void>;
  deleteMovement: (movementId: string) => Promise<void>;

  // Borders
  addBorder: (b: PizzaBorder) => Promise<void>;
  updateBorder: (b: PizzaBorder) => Promise<void>;
  deleteBorder: (id: string) => Promise<void>;

  // Soda products CRUD
  addSodaProduct: (p: SodaProduct) => Promise<void>;
  updateSodaProduct: (p: SodaProduct) => Promise<void>;
  deleteSodaProduct: (id: string) => Promise<void>;

  // Rules
  setFreeBorderRules: (rules: FreeBorderRule[]) => Promise<void>;
  setFreeSodaRules: (rules: FreeSodaRule[]) => Promise<void>;

  // Audit
  addAuditLog: (action: string, details: string) => Promise<void>;
}

export const useStore = create<AppState>()((set, get) => ({
  products: [],
  borders: [],
  sodaProducts: [],
  freeBorderRules: [],
  freeSodaRules: [],
  sales: [],
  cashRegister: null,
  cashHistory: [],
  auditLogs: [],
  // nextSaleCode removed
  loading: true,
  cart: [],

  fetchAll: async () => {
    // Only show loading spinner on initial load, not on realtime refetches
    const isInitial = get().loading;
    if (isInitial) set({ loading: true });

    try {
      const [
        { data: productsData },
        { data: bordersData },
        { data: sodaData },
        { data: fbrData },
        { data: fsrData },
        { data: salesData },
        { data: auditData },
        { data: registersData },
        { data: closedRegistersData },
      ] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('borders').select('*').order('name'),
        supabase.from('soda_products').select('*').order('name'),
        supabase.from('free_border_rules').select('*'),
        supabase.from('free_soda_rules').select('*'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('cash_registers').select('*').is('closed_at', null).limit(1),
        supabase.from('cash_registers').select('*').not('closed_at', 'is', null).order('closed_at', { ascending: false }).limit(50),
      ]);

      const openReg = registersData && registersData.length > 0 ? registersData[0] : null;
      const closedRegs = closedRegistersData || [];
      const allRegIds = [
        ...(openReg ? [openReg.id] : []),
        ...closedRegs.map(r => r.id),
      ];

      // Batched fetches for ALL registers at once — avoids the previous N+1 loop
      // that ran 3-4 sequential queries per register (200+ round-trips).
      const [{ data: movementsData }] = await Promise.all([
        allRegIds.length > 0
          ? supabase.from('cash_movements').select('*').in('register_id', allRegIds).order('created_at')
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const regSalesData = (salesData || []).filter((sale) => {
        const linkedRegisterId = sale.register_id ?? null;
        return linkedRegisterId === null || allRegIds.includes(linkedRegisterId);
      });

      // Sale items are fetched ONLY for sales that actually render them:
      //  - the global recent sales list (Vendas page detail / receipt)
      //  - the current OPEN register's sales (current shift in Caixa)
      // Closed-register history only shows totals, so we skip its items entirely.
      const openRegSaleIds = openReg
        ? resolveRegisterSales(openReg.id, regSalesData || [], true).map(s => s.id)
        : [];
      const itemSaleIds = Array.from(new Set([
        ...(salesData || []).map(s => s.id),
        ...openRegSaleIds,
      ]));
      const { data: saleItemsData } = itemSaleIds.length > 0
        ? await supabase.from('sale_items').select('*').in('sale_id', itemSaleIds)
        : { data: [] as any[] };

      // Group once into O(1) lookup maps (replaces O(n^2) filter-inside-map).
      const itemsBySale = new Map<string, any[]>();
      for (const si of (saleItemsData || [])) {
        const arr = itemsBySale.get(si.sale_id);
        if (arr) arr.push(si); else itemsBySale.set(si.sale_id, [si]);
      }
      const movementsByReg = new Map<string, any[]>();
      for (const m of (movementsData || [])) {
        const arr = movementsByReg.get(m.register_id);
        if (arr) arr.push(m); else movementsByReg.set(m.register_id, [m]);
      }
      const salesByReg = new Map<string, any[]>();
      for (const s of (regSalesData || [])) {
        const linkedRegisterId = s.register_id ?? null;
        if (linkedRegisterId) {
          const arr = salesByReg.get(linkedRegisterId);
          if (arr) arr.push(s); else salesByReg.set(linkedRegisterId, [s]);
        }
      }

      if (openReg) {
        const unlinkedSales = (regSalesData || []).filter(s => (s.register_id ?? null) === null);
        if (unlinkedSales.length > 0) {
          const existing = salesByReg.get(openReg.id) || [];
          salesByReg.set(openReg.id, [...existing, ...unlinkedSales]);
        }
      }

      const mapItem = (si: any): CartItem => ({
        id: si.id, product: si.product_data as any, quantity: si.quantity || 1,
        observations: si.observations || [], pizzaSize: si.pizza_size as PizzaSize | undefined,
        secondFlavor: si.second_flavor as any, calculatedPrice: Number(si.calculated_price),
        border: si.border_data as any, borderFree: si.border_free || false, freeSoda: si.free_soda as any,
      });
      const mapMovement = (m: any): CashMovement => ({
        id: m.id, type: m.type, amount: Number(m.amount), description: m.description || '',
        paymentMethod: m.payment_method, date: m.created_at, origin: m.origin as 'manual' | 'pdv',
      });
      const mapSale = (s: any, withItems: boolean): Sale => ({
        id: s.id, code: s.code, total: Number(s.total), change: Number(s.change_amount) || 0,
        date: s.created_at, customerName: s.customer_name || '', customerContact: s.customer_contact || '',
        observations: s.observations || [], cancelled: s.cancelled || false, cancelledAt: s.cancelled_at,
        deliveryMode: s.delivery_mode as any, deliveryAddress: s.delivery_address as any,
        deliveryFee: Number(s.delivery_fee) || 0, payments: (s.payments || []) as unknown as PaymentSplit[],
        items: withItems ? (itemsBySale.get(s.id) || []).map(mapItem) : [],
      });
      const buildRegister = (reg: any, withItems: boolean): CashRegister => {
        const movs = movementsByReg.get(reg.id) || [];
        const registerSales = resolveRegisterSales(reg.id, salesByReg.get(reg.id) || [], reg.id === openReg?.id);
        return {
          id: reg.id, openedAt: reg.opened_at!, closedAt: reg.closed_at || undefined,
          initialAmount: Number(reg.initial_amount) || 0,
          informedAmount: reg.informed_amount ? Number(reg.informed_amount) : undefined,
          sales: registerSales.map(s => mapSale(s, withItems)),
          entries: movs.filter(m => m.type === 'entry' || m.type === 'reforco').map(mapMovement),
          exits: movs.filter(m => m.type === 'exit' || m.type === 'sangria').map(mapMovement),
        };
      };

      const cashRegister = openReg ? buildRegister(openReg, true) : null;
      const cashHistory = closedRegs.map(reg => buildRegister(reg, false));
      const mappedSales: Sale[] = (salesData || []).map(s => mapSale(s, true));

      set({
        products: (productsData || []).map(mapProduct),
        borders: (bordersData || []).map(mapBorder),
        sodaProducts: (sodaData || []).map(mapSodaProduct),
        freeBorderRules: (fbrData || []).map(r => ({ size: r.size as PizzaSize, enabled: r.enabled ?? false })),
        freeSodaRules: (fsrData || []).map(r => ({ size: r.size as PizzaSize, enabled: r.enabled ?? false })),
        sales: mappedSales,
        cashRegister,
        cashHistory,
        auditLogs: (auditData || []).map(a => ({
          id: a.id, action: a.action, details: a.details || '', user: a.user_name || 'system', date: a.created_at!,
        })),
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch app data', error);
      set({ loading: false });
    }
  },

  // ===== PRODUCTS =====
  addProduct: async (p) => {
    const { error } = await supabase.from('products').insert({
      id: p.id, name: p.name, category: p.category, icon: p.icon, price: p.price, cost: p.cost,
      active: p.active, pizza_type: p.pizzaType || null, pizza_prices: p.pizzaPrices as any,
      pizza_costs: p.pizzaCosts as any, observations: p.observations || [],
    });
    if (!error) {
      set(s => ({ products: [...s.products, p] }));
      get().addAuditLog('PRODUCT_ADD', `Produto criado: ${p.name}`);
    }
  },
  updateProduct: async (p) => {
    const { error } = await supabase.from('products').update({
      name: p.name, category: p.category, icon: p.icon, price: p.price, cost: p.cost,
      active: p.active, pizza_type: p.pizzaType || null, pizza_prices: p.pizzaPrices as any,
      pizza_costs: p.pizzaCosts as any, observations: p.observations || [],
    }).eq('id', p.id);
    if (!error) {
      set(s => ({ products: s.products.map(x => x.id === p.id ? p : x) }));
      get().addAuditLog('PRODUCT_UPDATE', `Produto atualizado: ${p.name}`);
    }
  },
  deleteProduct: async (id) => {
    const product = get().products.find(p => p.id === id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      set(s => ({ products: s.products.filter(x => x.id !== id) }));
      get().addAuditLog('PRODUCT_DELETE', `Produto removido: ${product?.name || id}`);
    }
  },

  // ===== CART (local only) =====
  addToCart: (item) => set(s => {
    // Try to find an identical item to group
    const existingIndex = s.cart.findIndex(existing => {
      // Must be same product
      if (existing.product.id !== item.product.id) return false;
      // Same pizza size
      if (existing.pizzaSize !== item.pizzaSize) return false;
      // Same second flavor
      const existingSF = existing.secondFlavor?.id || null;
      const newSF = item.secondFlavor?.id || null;
      if (existingSF !== newSF) return false;
      // Same border
      const existingBorder = existing.border?.id || null;
      const newBorder = item.border?.id || null;
      if (existingBorder !== newBorder) return false;
      // Same borderFree flag
      if ((existing.borderFree || false) !== (item.borderFree || false)) return false;
      // Same freeSoda
      const existingSoda = existing.freeSoda?.id || null;
      const newSoda = item.freeSoda?.id || null;
      if (existingSoda !== newSoda) return false;
      // Same observations
      const existingObs = JSON.stringify(existing.observations || []);
      const newObs = JSON.stringify(item.observations || []);
      if (existingObs !== newObs) return false;
      // Same calculated price per unit
      if (existing.calculatedPrice !== item.calculatedPrice) return false;
      return true;
    });

    if (existingIndex >= 0) {
      const updated = [...s.cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + item.quantity,
      };
      return { cart: updated };
    }
    return { cart: [...s.cart, item] };
  }),
  removeFromCart: (itemId) => set(s => ({ cart: s.cart.filter(i => i.id !== itemId) })),
  updateCartItem: (itemId, updates) => set(s => ({ cart: s.cart.map(i => i.id === itemId ? { ...i, ...updates } : i) })),
  clearCart: () => set({ cart: [] }),

  // ===== SALES =====
  finalizeSale: async (payments, change, customerName, customerContact, observations, deliveryMode, deliveryAddress, deliveryFee) => {
    const state = get();
    const subtotal = state.cart.reduce((sum, i) => sum + i.calculatedPrice * i.quantity, 0);
    const total = subtotal + (deliveryFee || 0);

    let registerId = state.cashRegister?.id || null;
    if (!registerId) {
      const { data: openRegistersData, error: openRegistersError } = await supabase
        .from('cash_registers')
        .select('id')
        .is('closed_at', null)
        .limit(1);

      if (openRegistersError || !openRegistersData?.[0]?.id) {
        throw new Error('Nenhum caixa aberto para registrar a venda');
      }

      registerId = openRegistersData[0].id as string;
    }

    // Persist the sale AND its items atomically in a single transaction.
    // The backend assigns the per-register display code under an advisory lock
    // (no race / no duplicate codes) and the sale's permanent UUID is the only
    // key used for items, payments, history and reports.
    const itemsPayload = state.cart.map(item => ({
      product_data: item.product,
      quantity: item.quantity,
      observations: item.observations || [],
      pizza_size: item.pizzaSize || null,
      second_flavor: item.secondFlavor ?? null,
      calculated_price: item.calculatedPrice,
      border_data: item.border ?? null,
      border_free: item.borderFree || false,
      free_soda: item.freeSoda ?? null,
    }));

    const { data: saleRow, error } = await (supabase.rpc as any)('create_sale', {
      _register_id: registerId,
      _total: total,
      _change_amount: change,
      _customer_name: customerName,
      _customer_contact: customerContact,
      _observations: observations || [],
      _delivery_mode: deliveryMode || 'retirada',
      _delivery_address: (deliveryAddress as any) ?? null,
      _delivery_fee: deliveryFee || 0,
      _payments: payments as any,
      _items: itemsPayload as any,
    });

    if (error || !saleRow) {
      console.error('Falha ao registrar venda', error);
      throw new Error(error?.message || 'Falha ao registrar a venda');
    }

    const code = saleRow.code as string;

    const sale: Sale = {
      id: saleRow.id, code, items: [...state.cart], payments, total, change,
      date: saleRow.created_at, customerName, customerContact, observations: observations || [],
      cancelled: false, deliveryMode, deliveryAddress, deliveryFee,
    };

    const openRegisterId = registerId;
    set(s => {
      const nextCashRegister = s.cashRegister
        ? { ...s.cashRegister, sales: [...s.cashRegister.sales, sale] }
        : (openRegisterId ? {
            id: openRegisterId,
            openedAt: new Date().toISOString(),
            initialAmount: 0,
            sales: [sale],
            entries: [],
            exits: [],
          } : null);

      return {
        sales: [sale, ...s.sales],
        cart: [],
        cashRegister: nextCashRegister,
      };
    });

    get().addAuditLog('SALE', `Venda ${code} - Total: R$ ${total.toFixed(2)}`);
    return sale;
  },

  cancelSale: async (saleId) => {
    const sale = get().sales.find(s => s.id === saleId);
    if (!sale || sale.cancelled) return;
    const now = new Date().toISOString();
    await supabase.from('sales').update({ cancelled: true, cancelled_at: now }).eq('id', saleId);
    const updatedSale = { ...sale, cancelled: true, cancelledAt: now };
    set(s => ({
      sales: s.sales.map(sl => sl.id === saleId ? updatedSale : sl),
      cashRegister: s.cashRegister ? {
        ...s.cashRegister,
        sales: s.cashRegister.sales.map(sl => sl.id === saleId ? updatedSale : sl),
      } : s.cashRegister,
    }));
    get().addAuditLog('SALE_CANCEL', `Venda ${sale.code} cancelada`);
  },

  // ===== CASH REGISTER =====
  openRegister: async (initialAmount) => {
    const { data, error } = await supabase.from('cash_registers').insert({
      initial_amount: initialAmount,
    }).select().single();
    if (error || !data) return;
    set({
      cashRegister: {
        id: data.id, openedAt: data.opened_at!, initialAmount,
        sales: [], entries: [], exits: [],
      },
    });
    get().addAuditLog('REGISTER_OPEN', `Caixa aberto com R$ ${initialAmount.toFixed(2)}`);
  },

  closeRegister: async (informedAmount) => {
    const reg = get().cashRegister;
    if (!reg) return;
    const now = new Date().toISOString();
    await supabase.from('cash_registers').update({ closed_at: now, informed_amount: informedAmount }).eq('id', reg.id);
    const closed = { ...reg, closedAt: now, informedAmount };
    set(s => ({ cashRegister: null, cashHistory: [closed, ...s.cashHistory] }));
    get().addAuditLog('REGISTER_CLOSE', 'Caixa fechado');
  },

  addMovement: async (m) => {
    const reg = get().cashRegister;
    if (!reg) return;
    const { data, error } = await supabase.from('cash_movements').insert({
      register_id: reg.id, type: m.type, amount: m.amount,
      description: m.description, payment_method: m.paymentMethod || null, origin: m.origin || 'manual',
    }).select().single();
    if (error || !data) return;
    const movement: CashMovement = { id: data.id, type: m.type, amount: m.amount, description: m.description, paymentMethod: m.paymentMethod, date: data.created_at!, origin: m.origin as any };
    const isEntry = m.type === 'entry' || m.type === 'reforco';
    set(s => ({
      cashRegister: s.cashRegister ? {
        ...s.cashRegister,
        entries: isEntry ? [...s.cashRegister.entries, movement] : s.cashRegister.entries,
        exits: !isEntry ? [...s.cashRegister.exits, movement] : s.cashRegister.exits,
      } : s.cashRegister,
    }));
    get().addAuditLog('MOVEMENT_ADD', `${m.type}: R$ ${m.amount.toFixed(2)} - ${m.description}`);
  },

  deleteMovement: async (movementId) => {
    await supabase.from('cash_movements').delete().eq('id', movementId);
    set(s => ({
      cashRegister: s.cashRegister ? {
        ...s.cashRegister,
        entries: s.cashRegister.entries.filter(e => e.id !== movementId),
        exits: s.cashRegister.exits.filter(e => e.id !== movementId),
      } : s.cashRegister,
    }));
    get().addAuditLog('MOVEMENT_DELETE', 'Movimentação removida');
  },

  // ===== BORDERS =====
  addBorder: async (b) => {
    const { error } = await supabase.from('borders').insert({
      id: b.id, name: b.name, price: b.price, cost: b.cost,
      active: b.active, free_sizes: b.freeSizes,
    });
    if (!error) set(s => ({ borders: [...s.borders, b] }));
  },
  updateBorder: async (b) => {
    await supabase.from('borders').update({
      name: b.name, price: b.price, cost: b.cost,
      active: b.active, free_sizes: b.freeSizes,
    }).eq('id', b.id);
    set(s => ({ borders: s.borders.map(x => x.id === b.id ? b : x) }));
  },
  deleteBorder: async (id) => {
    await supabase.from('borders').delete().eq('id', id);
    set(s => ({ borders: s.borders.filter(x => x.id !== id) }));
  },

  // ===== SODA PRODUCTS CRUD =====
  addSodaProduct: async (p) => {
    const { error } = await supabase.from('soda_products').insert({
      id: p.id, name: p.name, icon: p.icon, price: p.price, cost: p.cost, active: p.active, size: p.size,
      free_sizes: p.freeSizes || [],
    });
    if (!error) set(s => ({ sodaProducts: [...s.sodaProducts, p] }));
  },
  updateSodaProduct: async (p) => {
    await supabase.from('soda_products').update({
      name: p.name, icon: p.icon, price: p.price, cost: p.cost, active: p.active, size: p.size,
      free_sizes: p.freeSizes || [],
    }).eq('id', p.id);
    set(s => ({ sodaProducts: s.sodaProducts.map(x => x.id === p.id ? p : x) }));
  },
  deleteSodaProduct: async (id) => {
    await supabase.from('soda_products').delete().eq('id', id);
    set(s => ({ sodaProducts: s.sodaProducts.filter(x => x.id !== id) }));
  },

  // ===== RULES =====
  setFreeBorderRules: async (rules) => {
    for (const r of rules) {
      await supabase.from('free_border_rules').upsert({ size: r.size, enabled: r.enabled }, { onConflict: 'size' });
    }
    set({ freeBorderRules: rules });
  },
  setFreeSodaRules: async (rules) => {
    for (const r of rules) {
      await supabase.from('free_soda_rules').upsert({ size: r.size, enabled: r.enabled }, { onConflict: 'size' });
    }
    set({ freeSodaRules: rules });
  },

  // ===== AUDIT =====
  addAuditLog: async (action, details) => {
    const { data } = await supabase.from('audit_logs').insert({ action, details }).select().single();
    if (data) {
      set(s => ({
        auditLogs: [{ id: data.id, action, details, user: 'system', date: data.created_at! }, ...s.auditLogs].slice(0, 500),
      }));
    }
  },
}));
