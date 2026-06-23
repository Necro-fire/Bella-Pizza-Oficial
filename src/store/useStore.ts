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

const PRODUCT_COLUMNS = 'id,name,category,icon,price,cost,active,pizza_type,pizza_prices,pizza_costs,observations';
const BORDER_COLUMNS = 'id,name,price,cost,active,free_sizes';
const SODA_COLUMNS = 'id,name,size,icon,price,cost,active,free_sizes';
const SALE_COLUMNS = 'id,code,total,change_amount,created_at,customer_name,customer_contact,observations,cancelled,cancelled_at,delivery_mode,delivery_address,delivery_fee,payments,register_id';
const SALE_ITEM_COLUMNS = 'id,sale_id,product_data,quantity,observations,pizza_size,second_flavor,calculated_price,border_data,border_free,free_soda';
const MOVEMENT_COLUMNS = 'id,register_id,type,amount,description,payment_method,created_at,origin';
const REGISTER_COLUMNS = 'id,opened_at,closed_at,initial_amount,informed_amount';

const mapMovement = (m: any): CashMovement => ({
  id: m.id, type: m.type, amount: Number(m.amount), description: m.description || '',
  paymentMethod: m.payment_method, date: m.created_at, origin: m.origin as 'manual' | 'pdv',
});

const mapSaleItem = (si: any): CartItem => ({
  id: si.id, product: si.product_data as any, quantity: si.quantity || 1,
  observations: si.observations || [], pizzaSize: si.pizza_size as PizzaSize | undefined,
  secondFlavor: si.second_flavor as any, calculatedPrice: Number(si.calculated_price),
  border: si.border_data as any, borderFree: si.border_free || false, freeSoda: si.free_soda as any,
});

const mapSaleRow = (s: any, itemsBySaleId: Map<string, any[]>): Sale => ({
  id: s.id, code: s.code, total: Number(s.total), change: Number(s.change_amount) || 0,
  date: s.created_at, customerName: s.customer_name || '', customerContact: s.customer_contact || '',
  observations: s.observations || [], cancelled: s.cancelled || false, cancelledAt: s.cancelled_at,
  deliveryMode: s.delivery_mode as any, deliveryAddress: s.delivery_address as any,
  deliveryFee: Number(s.delivery_fee) || 0, payments: (s.payments || []) as unknown as PaymentSplit[],
  items: (itemsBySaleId.get(s.id) || []).map(mapSaleItem),
});

const indexBy = <T extends Record<string, any>>(rows: T[] = [], key: keyof T) => {
  const map = new Map<string, T[]>();
  rows.forEach(row => {
    const mapKey = String(row[key]);
    const current = map.get(mapKey) || [];
    current.push(row);
    map.set(mapKey, current);
  });
  return map;
};

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
  fetchSales: (startIso?: string, endIso?: string) => Promise<void>;
  fetchCashHistory: (startIso?: string, endIso?: string) => Promise<void>;

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
    const [
      { data: productsData },
      { data: bordersData },
      { data: sodaData },
      { data: fbrData },
      { data: fsrData },
      { data: registersData },
    ] = await Promise.all([
      supabase.from('products').select(PRODUCT_COLUMNS).order('name'),
      supabase.from('borders').select(BORDER_COLUMNS).order('name'),
      supabase.from('soda_products').select(SODA_COLUMNS).order('name'),
      supabase.from('free_border_rules').select('*'),
      supabase.from('free_soda_rules').select('*'),
      supabase.from('cash_registers').select(REGISTER_COLUMNS).is('closed_at', null).order('opened_at', { ascending: false }).limit(1),
    ]);

    // Get open register with its movements and sales
    let cashRegister: CashRegister | null = null;
    if (registersData && registersData.length > 0) {
      const reg = registersData[0];
      const [{ data: movements }, { data: regSales }] = await Promise.all([
        supabase.from('cash_movements').select(MOVEMENT_COLUMNS).eq('register_id', reg.id).order('created_at'),
        supabase.from('sales').select(SALE_COLUMNS).eq('register_id', reg.id).order('created_at'),
      ]);

      const regSaleIds = (regSales || []).map(s => s.id);
      const { data: saleItemsData } = regSaleIds.length > 0
        ? await supabase.from('sale_items').select(SALE_ITEM_COLUMNS).in('sale_id', regSaleIds)
        : { data: [] };

      const openItemsBySaleId = indexBy(saleItemsData || [], 'sale_id');
      const entries = (movements || []).filter(m => m.type === 'entry' || m.type === 'reforco');
      const exits = (movements || []).filter(m => m.type === 'exit' || m.type === 'sangria');

      cashRegister = {
        id: reg.id, openedAt: reg.opened_at!, closedAt: reg.closed_at || undefined,
        initialAmount: Number(reg.initial_amount) || 0, informedAmount: reg.informed_amount ? Number(reg.informed_amount) : undefined,
        sales: (regSales || []).map(s => mapSaleRow(s, openItemsBySaleId)),
        entries: (entries || []).map(mapMovement),
        exits: (exits || []).map(mapMovement),
      };
    }

    set({
      products: (productsData || []).map(mapProduct),
      borders: (bordersData || []).map(mapBorder),
      sodaProducts: (sodaData || []).map(mapSodaProduct),
      freeBorderRules: (fbrData || []).map(r => ({ size: r.size as PizzaSize, enabled: r.enabled ?? false })),
      freeSodaRules: (fsrData || []).map(r => ({ size: r.size as PizzaSize, enabled: r.enabled ?? false })),
      cashRegister,
      loading: false,
    });
  },

  fetchSales: async (startIso, endIso) => {
    let query = supabase.from('sales').select(SALE_COLUMNS).order('created_at', { ascending: false }).limit(1000);

    if (startIso) query = query.gte('created_at', startIso);
    if (endIso) query = query.lte('created_at', endIso);

    const { data: salesData, error } = await query;
    if (error) return;

    const saleIds = (salesData || []).map(s => s.id);
    const { data: saleItemsData } = saleIds.length > 0
      ? await supabase.from('sale_items').select(SALE_ITEM_COLUMNS).in('sale_id', saleIds)
      : { data: [] };

    const itemsBySaleId = indexBy(saleItemsData || [], 'sale_id');
    set({ sales: (salesData || []).map(s => mapSaleRow(s, itemsBySaleId)) });
  },

  fetchCashHistory: async (startIso, endIso) => {
    let registersQuery = supabase
      .from('cash_registers')
      .select(REGISTER_COLUMNS)
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(50);

    if (startIso) registersQuery = registersQuery.gte('opened_at', startIso);
    if (endIso) registersQuery = registersQuery.lte('opened_at', endIso);

    const { data: closedRegistersData } = await registersQuery;
    if (!closedRegistersData || closedRegistersData.length === 0) {
      set({ cashHistory: [] });
      return;
    }

    const closedIds = closedRegistersData.map(r => r.id);
    const [{ data: allMovements }, { data: allRegSales }] = await Promise.all([
      supabase.from('cash_movements').select(MOVEMENT_COLUMNS).in('register_id', closedIds).order('created_at'),
      supabase.from('sales').select(SALE_COLUMNS).in('register_id', closedIds).order('created_at'),
    ]);

    const movementsByRegisterId = indexBy(allMovements || [], 'register_id');
    const salesByRegisterId = indexBy(allRegSales || [], 'register_id');
    const emptyItemsBySaleId = new Map<string, any[]>();

    set({
      cashHistory: closedRegistersData.map(reg => {
        const regMovements = movementsByRegisterId.get(reg.id) || [];
        return {
          id: reg.id,
          openedAt: reg.opened_at!,
          closedAt: reg.closed_at || undefined,
          initialAmount: Number(reg.initial_amount) || 0,
          informedAmount: reg.informed_amount ? Number(reg.informed_amount) : undefined,
          sales: (salesByRegisterId.get(reg.id) || []).map(s => mapSaleRow(s, emptyItemsBySaleId)),
          entries: regMovements.filter(m => m.type === 'entry' || m.type === 'reforco').map(mapMovement),
          exits: regMovements.filter(m => m.type === 'exit' || m.type === 'sangria').map(mapMovement),
        };
      }),
    });
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
    const registerId = state.cashRegister?.id || null;

    // Generate code atomically in the backend
    const { data: codeData, error: codeError } = await supabase.rpc('generate_sale_code', { _register_id: registerId });
    if (codeError || !codeData) throw new Error('Falha ao gerar código da venda');
    const code = codeData as string;

    const { data: saleRow, error } = await supabase.from('sales').insert({
      code, register_id: registerId, total, change_amount: change,
      customer_name: customerName, customer_contact: customerContact,
      observations: observations || [], delivery_mode: deliveryMode || 'retirada',
      delivery_address: deliveryAddress as any, delivery_fee: deliveryFee || 0,
      payments: payments as any,
    }).select(SALE_COLUMNS).single();

    if (error || !saleRow) throw new Error('Failed to save sale');

    const itemsToInsert = state.cart.map(item => ({
      sale_id: saleRow.id,
      product_data: item.product as any,
      quantity: item.quantity,
      observations: item.observations,
      pizza_size: item.pizzaSize || null,
      second_flavor: item.secondFlavor as any || null,
      calculated_price: item.calculatedPrice,
      border_data: item.border as any || null,
      border_free: item.borderFree || false,
      free_soda: item.freeSoda as any || null,
    }));
    await supabase.from('sale_items').insert(itemsToInsert);

    const sale: Sale = {
      id: saleRow.id, code, items: [...state.cart], payments, total, change,
      date: saleRow.created_at, customerName, customerContact, observations: observations || [],
      cancelled: false, deliveryMode, deliveryAddress, deliveryFee,
    };

    set(s => ({
      sales: [sale, ...s.sales],
      cart: [],
      cashRegister: s.cashRegister ? { ...s.cashRegister, sales: [...s.cashRegister.sales, sale] } : s.cashRegister,
    }));

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
    }).select(REGISTER_COLUMNS).single();
    if (error || !data) return;
    // Reset the sale code counter so codes restart from 000001 for this register
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
    }).select(MOVEMENT_COLUMNS).single();
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
    await Promise.all(rules.map(r =>
      supabase.from('free_border_rules').upsert({ size: r.size, enabled: r.enabled }, { onConflict: 'size' })
    ));
    set({ freeBorderRules: rules });
  },
  setFreeSodaRules: async (rules) => {
    await Promise.all(rules.map(r =>
      supabase.from('free_soda_rules').upsert({ size: r.size, enabled: r.enabled }, { onConflict: 'size' })
    ));
    set({ freeSodaRules: rules });
  },

  // ===== AUDIT =====
  addAuditLog: async (action, details) => {
    const date = new Date().toISOString();
    await supabase.from('audit_logs').insert({ action, details, created_at: date });
    set(s => ({
      auditLogs: [{ id: crypto.randomUUID(), action, details, user: 'system', date }, ...s.auditLogs].slice(0, 100),
    }));
  },
}));
