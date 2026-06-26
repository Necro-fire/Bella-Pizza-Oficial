import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRegisterSales, useStore } from '@/store/useStore';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('useStore finalizeSale', () => {
  let saleSequence = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    saleSequence = 0;
    useStore.setState({
      cart: [{
        id: 'item-1',
        product: { id: 'p1', name: 'Pizza', category: 'pizza', icon: '🍕', price: 30, cost: 15, active: true },
        quantity: 1,
        observations: [],
        calculatedPrice: 30,
      }],
      sales: [],
      cashRegister: null,
      auditLogs: [],
      loading: false,
    });

    mockSupabase.rpc.mockImplementation(async (fn: string, params: any) => {
      if (fn === 'create_sale') {
        saleSequence += 1;
        return {
          data: {
            id: `sale-${saleSequence}`,
            code: String(saleSequence).padStart(6, '0'),
            created_at: '2024-01-01T00:00:00.000Z',
            total: params?._total ?? 0,
            register_id: params?._register_id ?? null,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'cash_registers') {
        return {
          select: () => ({
            is: () => ({
              limit: async () => ({ data: [{ id: 'reg-123' }], error: null }),
            }),
          }),
        };
      }

      if (table === 'sales') {
        const insert = vi.fn().mockImplementation(() => ({
          select: () => ({
            single: async () => {
              saleSequence += 1;
              return { data: { id: `sale-${saleSequence}`, created_at: '2024-01-01T00:00:00.000Z' }, error: null };
            },
          }),
        }));
        const update = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

        return { insert, update };
      }

      if (table === 'sale_items') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: async () => ({ data: { id: 'log-1', created_at: '2024-01-01T00:00:00.000Z' }, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('uses the active register from the database when the local cash register state is missing', async () => {
    await useStore.getState().finalizeSale([], 0, '', '', [], 'retirada', undefined, 0);

    const createCall = mockSupabase.rpc.mock.calls.find((call) => call[0] === 'create_sale');
    expect(createCall?.[1]?._register_id).toBe('reg-123');
  });

  it('includes sales without register_id in the currently open register', () => {
    const rows = [{ id: 'sale-1', register_id: null }];

    const result = resolveRegisterSales('reg-123', rows, true);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sale-1');
  });

  it('updates the local open register with the new sale when the state is empty', async () => {
    useStore.setState({ cashRegister: null });

    await useStore.getState().finalizeSale([], 0, '', '', [], 'retirada', undefined, 0);

    const state = useStore.getState();
    expect(state.cashRegister?.sales).toHaveLength(1);
    expect(state.cashRegister?.sales[0].total).toBe(30);
  });

  it('resets loading state when the initial data fetch fails', async () => {
    useStore.setState({ loading: true });
    mockSupabase.from.mockImplementation(() => ({
      select: () => {
        throw new Error('db down');
      },
    }));

    await expect(useStore.getState().fetchAll()).resolves.toBeUndefined();
    expect(useStore.getState().loading).toBe(false);
  });

  it('accumulates multiple sales in the open register and removes cancelled ones from the total', async () => {
    useStore.setState({
      cashRegister: {
        id: 'reg-123',
        openedAt: '2024-01-01T00:00:00.000Z',
        initialAmount: 100,
        sales: [],
        entries: [],
        exits: [],
      },
    });

    useStore.setState({
      cart: [{
        id: 'item-1',
        product: { id: 'p1', name: 'Pizza', category: 'pizza', icon: '🍕', price: 30, cost: 15, active: true },
        quantity: 1,
        observations: [],
        calculatedPrice: 30,
      }],
    });

    await useStore.getState().finalizeSale([], 0, '', '', [], 'retirada', undefined, 0);
    useStore.setState({
      cart: [{
        id: 'item-2',
        product: { id: 'p2', name: 'Hambúrguer', category: 'hamburguer', icon: '🍔', price: 30, cost: 15, active: true },
        quantity: 1,
        observations: [],
        calculatedPrice: 30,
      }],
    });
    await useStore.getState().finalizeSale([], 0, '', '', [], 'retirada', undefined, 0);

    const stateAfterSales = useStore.getState();
    const salesTotal = stateAfterSales.cashRegister?.sales.reduce((sum, sale) => sum + sale.total, 0) ?? 0;
    expect(salesTotal).toBe(60);

    const firstSaleId = stateAfterSales.sales[0]?.id ?? '';
    useStore.setState((state) => ({
      sales: state.sales.map((sale) => sale.id === firstSaleId ? { ...sale, cancelled: true, cancelledAt: '2024-01-01T00:00:00.000Z' } : sale),
      cashRegister: state.cashRegister ? {
        ...state.cashRegister,
        sales: state.cashRegister.sales.map((sale) => sale.id === firstSaleId ? { ...sale, cancelled: true, cancelledAt: '2024-01-01T00:00:00.000Z' } : sale),
      } : state.cashRegister,
    }));

    const stateAfterCancel = useStore.getState();
    const activeSalesTotal = stateAfterCancel.cashRegister?.sales.filter((sale) => !sale.cancelled).reduce((sum, sale) => sum + sale.total, 0) ?? 0;
    expect(activeSalesTotal).toBe(30);
  });
});
