import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { PinDialog } from '@/components/PinDialog';
import { TrendingUp, ShoppingBag, Receipt, PieChart, Lock } from 'lucide-react';

export default function Dashboard() {
  const { sales, products, pinUnlocked, userRole } = useStore();
  const [showPin, setShowPin] = useState(false);

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-medium">Acesso restrito</p>
          <p className="text-sm">Apenas administradores podem visualizar o dashboard</p>
        </div>
      </div>
    );
  }

  if (!pinUnlocked) {
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium mb-4">Dashboard protegido por PIN</p>
            <button
              onClick={() => setShowPin(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors active:scale-[0.97]"
            >
              Inserir PIN
            </button>
          </div>
        </div>
        <PinDialog open={showPin} onClose={() => setShowPin(false)} onSuccess={() => setShowPin(false)} />
      </>
    );
  }

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const totalSales = sales.length;
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalCost = sales.reduce(
    (s, sale) => s + sale.items.reduce((s2, i) => s2 + i.product.cost * i.quantity, 0),
    0
  );
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Top products
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSales[item.product.id]) {
        productSales[item.product.id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productSales[item.product.id].qty += item.quantity;
      productSales[item.product.id].revenue += item.product.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const cards = [
    { label: 'Faturamento', value: `R$ ${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Total de Vendas', value: totalSales.toString(), icon: ShoppingBag, color: 'text-info' },
    { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2)}`, icon: Receipt, color: 'text-warning' },
    { label: 'Margem de Lucro', value: `${margin.toFixed(1)}%`, icon: PieChart, color: 'text-primary' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={c.label} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-bold mb-3">Lucro</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receita</span>
              <span>R$ {totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo</span>
              <span className="text-destructive">- R$ {totalCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Lucro Líquido</span>
              <span className="text-success">R$ {profit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold mb-3">Produtos Mais Vendidos</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <span className="text-muted-foreground">{p.qty} un</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
