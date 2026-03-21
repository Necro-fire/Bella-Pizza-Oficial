import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Product, Category } from '@/types/pizzaria';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PinDialog } from '@/components/PinDialog';
import { Plus, Edit, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'pizza', image: '🍕', price: 0, cost: 0, active: true,
};

const categoryEmojis: Record<Category, string> = { pizza: '🍕', bebidas: '🥤', outros: '📦' };

export default function Produtos() {
  const { products, addProduct, updateProduct, pinUnlocked, userRole } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [showPin, setShowPin] = useState(false);

  const canSeeCost = userRole === 'admin' && pinUnlocked;

  const openNew = () => { setEditing(null); setForm(emptyProduct); setShowForm(true); };
  const openEdit = (p: Product) => {
    if (!canSeeCost) {
      setShowPin(true);
      return;
    }
    setEditing(p); setForm(p); setShowForm(true);
  };

  const save = () => {
    if (!form.name || form.price <= 0) { toast.error('Preencha nome e preço'); return; }
    if (editing) {
      updateProduct({ ...editing, ...form });
      toast.success('Produto atualizado');
    } else {
      addProduct({ ...form, id: crypto.randomUUID() });
      toast.success('Produto criado');
    }
    setShowForm(false);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          {userRole === 'admin' && !pinUnlocked && (
            <Button onClick={() => setShowPin(true)} variant="outline" className="gap-2">
              <Lock className="w-4 h-4" /> Desbloquear custos
            </Button>
          )}
          <Button onClick={openNew} className="bg-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p, i) => (
          <div
            key={p.id}
            className={`glass-card p-4 flex items-center gap-4 animate-fade-in ${!p.active ? 'opacity-50' : ''}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-3xl">{p.image}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-primary font-bold">R$ {p.price.toFixed(2)}</p>
              {canSeeCost && (
                <p className="text-xs text-muted-foreground">Custo: R$ {p.cost.toFixed(2)} · Lucro: R$ {(p.price - p.cost).toFixed(2)}</p>
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${p.active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                {p.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground transition-colors active:scale-95">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary" />
            <div className="flex gap-2">
              {(['pizza', 'bebidas', 'outros'] as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, category: c, image: categoryEmojis[c] })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {categoryEmojis[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <Input type="number" placeholder="Preço de venda" value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="bg-secondary" />
            {canSeeCost && (
              <Input type="number" placeholder="Custo" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="bg-secondary" />
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status:</label>
              <button
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${
                  form.active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                }`}
              >
                {form.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {form.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            <Button onClick={save} className="w-full bg-primary text-primary-foreground font-bold">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PinDialog open={showPin} onClose={() => setShowPin(false)} onSuccess={() => setShowPin(false)} />
    </div>
  );
}
