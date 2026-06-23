import { useState, useMemo, useEffect } from 'react';
import { PinGuard } from '@/components/PinGuard';
import { DateFilter, DatePreset } from '@/components/DateFilter';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/format';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, CreditCard, Receipt, Pizza, Beef, Wine, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PizzaSize, Sale } from '@/types/pizzaria';

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(280,70%,50%)', 'hsl(25,95%,53%)',
];

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
    {message}
  </div>
);

export default function Dashboard() {
  const { cashRegister, products } = useStore();
  const [dateRange, setDateRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [periodSales, setPeriodSales] = useState<Sale[]>([]);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchPeriodSales = async () => {
      setLoadingPeriod(true);

      const { data: salesRows, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: true })
        .limit(1000);

      if (salesError) {
        if (active) {
          setPeriodSales([]);
          setLoadingPeriod(false);
        }
        return;
      }

      const saleIds = (salesRows || []).map((sale) => sale.id);
      const { data: saleItemsRows, error: itemsError } = saleIds.length > 0
        ? await supabase.from('sale_items').select('*').in('sale_id', saleIds)
        : { data: [], error: null };

      if (itemsError) {
        if (active) {
          setPeriodSales([]);
          setLoadingPeriod(false);
        }
        return;
      }

      const mappedSales: Sale[] = (salesRows || []).map((sale) => ({
        id: sale.id,
        code: sale.code,
        total: Number(sale.total),
        change: Number(sale.change_amount) || 0,
        date: sale.created_at,
        customerName: sale.customer_name || '',
        customerContact: sale.customer_contact || '',
        observations: sale.observations || [],
        cancelled: sale.cancelled || false,
        cancelledAt: sale.cancelled_at || undefined,
        deliveryMode: sale.delivery_mode as any,
        deliveryAddress: sale.delivery_address as any,
        deliveryFee: Number(sale.delivery_fee) || 0,
        payments: (sale.payments || []) as any,
        items: (saleItemsRows || [])
          .filter((item) => item.sale_id === sale.id)
          .map((item) => ({
            id: item.id,
            product: item.product_data as any,
            quantity: item.quantity || 1,
            observations: item.observations || [],
            pizzaSize: (item.pizza_size as PizzaSize | null) || undefined,
            secondFlavor: item.second_flavor as any,
            calculatedPrice: Number(item.calculated_price),
            border: item.border_data as any,
            borderFree: item.border_free || false,
            freeSoda: item.free_soda as any,
          })),
      }));

      if (active) {
        setPeriodSales(mappedSales.filter((sale) => !sale.cancelled));
        setLoadingPeriod(false);
      }
    };

    fetchPeriodSales();

    return () => {
      active = false;
    };
  }, [dateRange.end, dateRange.start]);

  const filtered = useMemo(() => periodSales, [periodSales]);

  const totalRevenue = filtered.reduce((s, sale) => s + sale.total, 0);
  const totalCost = filtered.reduce((s, sale) => s + sale.items.reduce((c, i) => {
    const cost = i.product.category === 'pizza' && i.pizzaSize && i.product.pizzaCosts
      ? i.product.pizzaCosts[i.pizzaSize] : i.product.cost;
    return c + (cost || 0) * i.quantity;
  }, 0), 0);
  const profit = totalRevenue - totalCost;
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const totalItems = filtered.reduce((s, sale) => s + sale.items.reduce((c, i) => c + i.quantity, 0), 0);
  const isOpen = cashRegister && !cashRegister.closedAt;
  const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0';

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => s.items.forEach(i => {
      map[i.product.category] = (map[i.product.category] || 0) + i.calculatedPrice * i.quantity;
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const dailyData = useMemo(() => {
    const byHour = datePreset === 'today' || datePreset === 'yesterday';
    const map: Record<string, { revenue: number; cost: number; sortKey: string }> = {};
    filtered.forEach(s => {
      const saleDate = new Date(s.date);
      const key = byHour ? format(saleDate, 'dd/MM HH:00') : format(saleDate, 'dd/MM');
      const sortKey = byHour ? format(saleDate, 'yyyy-MM-dd HH:00') : format(saleDate, 'yyyy-MM-dd');
      if (!map[key]) map[key] = { revenue: 0, cost: 0, sortKey };
      map[key].revenue += s.total;
      map[key].cost += s.items.reduce((c, i) => {
        const cost = i.product.category === 'pizza' && i.pizzaSize && i.product.pizzaCosts
          ? i.product.pizzaCosts[i.pizzaSize] : i.product.cost;
        return c + (cost || 0) * i.quantity;
      }, 0);
    });
    return Object.entries(map)
      .map(([date, v]) => ({ date, ...v, profit: v.revenue - v.cost }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [datePreset, filtered]);


  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => s.payments.forEach(p => {
      map[p.method] = (map[p.method] || 0) + p.amount;
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Top 3 pizzas - 1 flavor
  const top1Flavor = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(s => s.items.forEach(i => {
      if (i.product.category === 'pizza' && !i.secondFlavor) {
        const key = i.product.id;
        if (!map[key]) map[key] = { name: i.product.name, qty: 0 };
        map[key].qty += i.quantity;
      }
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [filtered]);

  // Top 3 pizzas - 2 flavors
  const top2Flavors = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(s => s.items.forEach(i => {
      if (i.product.category === 'pizza' && i.secondFlavor) {
        const key = `${i.product.name} / ${i.secondFlavor.name}`;
        if (!map[key]) map[key] = { name: key, qty: 0 };
        map[key].qty += i.quantity;
      }
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [filtered]);

  // Top hamburgers
  const topHamburgers = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(s => s.items.forEach(i => {
      if (i.product.category === 'hamburguer') {
        const key = i.product.id;
        if (!map[key]) map[key] = { name: i.product.name, qty: 0 };
        map[key].qty += i.quantity;
      }
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [filtered]);

  // Top beverages
  const topBebidas = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(s => s.items.forEach(i => {
      if (i.product.category === 'bebida') {
        const key = i.product.id;
        if (!map[key]) map[key] = { name: i.product.name, qty: 0 };
        map[key].qty += i.quantity;
      }
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [filtered]);

  // Top portions
  const topPorcoes = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(s => s.items.forEach(i => {
      if (i.product.category === 'porcao') {
        const key = i.product.id;
        if (!map[key]) map[key] = { name: i.product.name, qty: 0 };
        map[key].qty += i.quantity;
      }
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [filtered]);

  const PAYMENT_LABELS: Record<string, string> = {
    dinheiro: 'Dinheiro', pix: 'Pix',
    debito: 'Débito', credito: 'Crédito',
  };

  const noData = !loadingPeriod && filtered.length === 0;

  return (
    <PinGuard title="Dashboard">
      <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Visão geral do seu negócio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`status-badge ${isOpen ? 'status-open' : 'status-closed'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-success' : 'bg-destructive'}`} />
              Caixa {isOpen ? 'Aberto' : 'Fechado'}
            </div>
            <DateFilter onFilter={(s, e, p) => {
              setDateRange({ start: s, end: e });
              if (p) setDatePreset(p);
            }} />
          </div>
        </div>

        {noData && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
            <p className="text-sm text-warning font-medium">Nenhum dado encontrado neste período</p>
            <p className="text-xs text-muted-foreground mt-1">Tente alterar o filtro de datas</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Vendas" value={String(filtered.length)} sub={`${totalItems} itens vendidos`} icon={<ShoppingCart className="w-4 h-4" />} variant="info" />
          <KpiCard label="Faturamento" value={formatCurrency(totalRevenue)} sub={`Ticket médio: ${formatCurrency(avgTicket)}`} icon={<DollarSign className="w-4 h-4" />} variant="primary" />
          <KpiCard label="Custo" value={formatCurrency(totalCost)} sub={`Margem: ${margin}%`} icon={<TrendingDown className="w-4 h-4" />} variant="destructive" />
          <KpiCard label="Lucro" value={formatCurrency(profit)} icon={<TrendingUp className="w-4 h-4" />} variant={profit >= 0 ? 'success' : 'destructive'} />
          <KpiCard label="Produtos Ativos" value={String(products.filter(p => p.active).length)} sub="No catálogo" icon={<Package className="w-4 h-4" />} variant="warning" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Receita & Lucro</h3>
            {loadingPeriod ? (
              <EmptyState message="Carregando dados do período..." />
            ) : dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyData} margin={{ top: 8, right: 12, left: 2, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    allowDataOverflow={false}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Lucro" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Nenhum dado encontrado neste período" />
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Por Categoria</h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Nenhum dado encontrado neste período" />
            )}
          </div>
        </div>

        {/* Rankings by Category + Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Rankings */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">🏆 Mais Vendidos por Categoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RankingBlock title="🍕 Pizza (1 sabor)" items={top1Flavor} color="text-primary" />
              <RankingBlock title="🍕🍕 Pizza (2 sabores)" items={top2Flavors} color="text-info" />
              <RankingBlock title="🍔 Hambúrguer" items={topHamburgers} color="text-warning" />
              <RankingBlock title="🥤 Bebida" items={topBebidas} color="text-success" />
              <RankingBlock title="🍟 Porção" items={topPorcoes} color="text-primary" />
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" /> Formas de Pagamento
            </h3>
            {paymentData.length > 0 ? (
              <div className="space-y-3">
                {paymentData.map((p) => {
                  const pct = totalRevenue > 0 ? (p.value / totalRevenue) * 100 : 0;
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[p.name] || p.name}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(p.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right">{pct.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="Nenhum dado encontrado neste período" />
            )}
          </div>
        </div>
      </div>
    </PinGuard>
  );
}

function KpiCard({ label, value, sub, icon, variant }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  variant: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
}) {
  const colorMap = {
    primary: { text: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/5', bar: 'bg-primary' },
    success: { text: 'text-success', border: 'border-success/20', bg: 'bg-success/5', bar: 'bg-success' },
    warning: { text: 'text-warning', border: 'border-warning/20', bg: 'bg-warning/5', bar: 'bg-warning' },
    info: { text: 'text-info', border: 'border-info/20', bg: 'bg-info/5', bar: 'bg-info' },
    destructive: { text: 'text-destructive', border: 'border-destructive/20', bg: 'bg-destructive/5', bar: 'bg-destructive' },
  };
  const c = colorMap[variant];

  return (
    <div className={`bg-card border ${c.border} rounded-lg p-4 relative overflow-hidden transition-all duration-200 hover:shadow-md`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <div className={`${c.text} opacity-60`}>{icon}</div>
      </div>
      <p className={`text-2xl font-extrabold ${c.text} tabular-nums leading-tight`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function RankingBlock({ title, items, color }: { title: string; items: { name: string; qty: number }[]; color: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-foreground mb-2">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-1.5">
          {items.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border/50">
              <span className={`text-xs font-bold ${color} w-5 text-center`}>{i + 1}º</span>
              <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{p.qty}x</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">Sem dados</p>
      )}
    </div>
  );
}
