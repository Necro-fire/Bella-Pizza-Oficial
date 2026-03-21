import { useLocation, Link } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, Package, Wallet, Lock, Unlock } from 'lucide-react';
import { useStore } from '@/store/useStore';

const links = [
  { to: '/', label: 'PDV', icon: ShoppingCart },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
];

export function TopNav() {
  const { pathname } = useLocation();
  const { userRole, pinUnlocked, lockPin } = useStore();

  return (
    <nav className="h-14 bg-card border-b border-border flex items-center px-4 gap-1 shrink-0">
      <span className="text-primary font-extrabold text-lg tracking-tight mr-6">🍕 PizzaPDV</span>
      {links.map((l) => {
        const active = pathname === l.to;
        if (l.to === '/dashboard' && userRole !== 'admin') return null;
        return (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <l.icon className="w-4 h-4" />
            {l.label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-1 rounded">{userRole}</span>
        {userRole === 'admin' && pinUnlocked && (
          <button onClick={lockPin} className="text-success hover:text-foreground transition-colors" title="Bloquear PIN">
            <Unlock className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
