import { useState } from 'react';
import { PinGuard } from '@/components/PinGuard';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/authStore';
import { Product, Category, CATEGORIES, PIZZA_TYPES, PizzaSize, PIZZA_SIZES, PizzaBorder, SodaProduct } from '@/types/pizzaria';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Lock, Gift, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ICONS = ['🍕','🍔','🥤','🧃','💧','🍟','🧅','🧀','🫙','🍰','🍫','🍌','☕','🥛','🍺','🥩','🌭','🥗','➕','📦'];

const DEFAULT_PIZZA_PRICES = { P: 0, M: 0, G: 0, GG: 0 } as Record<PizzaSize, number>;

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'pizza', icon: '🍕', price: 0, cost: 0, active: true, observations: [],
  pizzaType: 'tradicional', pizzaPrices: { ...DEFAULT_PIZZA_PRICES }, pizzaCosts: { ...DEFAULT_PIZZA_PRICES },
};

const emptyBorder: Omit<PizzaBorder, 'id'> = {
  name: '', price: 0, cost: 0, active: true, freeSizes: [],
};

const emptySoda: Omit<SodaProduct, 'id'> = {
  name: '', icon: '🥤', price: 0, cost: 0, active: true, size: '1L', freeSizes: [],
};

export default function Produtos() {
  const {
    products, addProduct, updateProduct, deleteProduct,
    borders, addBorder, updateBorder, deleteBorder,
    sodaProducts, addSodaProduct, updateSodaProduct, deleteSodaProduct,
  } = useStore();
  const { pinUnlocked } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [obsInput, setObsInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Border dialog
  const [borderDialogOpen, setBorderDialogOpen] = useState(false);
  const [editingBorder, setEditingBorder] = useState<PizzaBorder | null>(null);
  const [borderForm, setBorderForm] = useState<Omit<PizzaBorder, 'id'>>(emptyBorder);
  const [deleteBorderConfirm, setDeleteBorderConfirm] = useState<string | null>(null);

  // Soda dialog
  const [sodaDialogOpen, setSodaDialogOpen] = useState(false);
  const [editingSoda, setEditingSoda] = useState<SodaProduct | null>(null);
  const [sodaForm, setSodaForm] = useState<Omit<SodaProduct, 'id'>>(emptySoda);
  const [deleteSodaConfirm, setDeleteSodaConfirm] = useState<string | null>(null);

  const filtered = products.filter(p => filterCat === 'all' || p.category === filterCat);
  const isPizza = form.category === 'pizza';

  const openNew = () => { setForm(emptyProduct); setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Product) => { setForm({ ...p }); setEditing(p); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (editing) { await updateProduct({ ...form, id: editing.id } as Product); toast.success('Atualizado'); }
    else { await addProduct({ ...form, id: crypto.randomUUID() } as Product); toast.success('Adicionado'); }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setDeleteConfirm(id); };
  const confirmDelete = async () => { if (deleteConfirm) { await deleteProduct(deleteConfirm); toast.success('Removido'); setDeleteConfirm(null); } };
  const addObs = () => { if (!obsInput.trim()) return; setForm({ ...form, observations: [...(form.observations || []), obsInput.trim()] }); setObsInput(''); };

  // Border handlers
  const openNewBorder = () => { setBorderForm({ ...emptyBorder }); setEditingBorder(null); setBorderDialogOpen(true); };
  const openEditBorder = (b: PizzaBorder) => { setBorderForm({ name: b.name, price: b.price, cost: b.cost, active: b.active, freeSizes: [...b.freeSizes] }); setEditingBorder(b); setBorderDialogOpen(true); };
  const handleSaveBorder = async () => {
    if (!borderForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (editingBorder) { await updateBorder({ ...borderForm, id: editingBorder.id } as PizzaBorder); toast.success('Borda atualizada'); }
    else { await addBorder({ ...borderForm, id: crypto.randomUUID() } as PizzaBorder); toast.success('Borda adicionada'); }
    setBorderDialogOpen(false);
  };
  const confirmDeleteBorder = async () => { if (deleteBorderConfirm) { await deleteBorder(deleteBorderConfirm); toast.success('Borda removida'); setDeleteBorderConfirm(null); } };

  const toggleBorderFreeSize = (sz: PizzaSize) => {
    const current = borderForm.freeSizes || [];
    setBorderForm({ ...borderForm, freeSizes: current.includes(sz) ? current.filter(s => s !== sz) : [...current, sz] });
  };

  // Soda handlers
  const openNewSoda = () => { setSodaForm({ ...emptySoda }); setEditingSoda(null); setSodaDialogOpen(true); };
  const openEditSoda = (s: SodaProduct) => { setSodaForm({ name: s.name, icon: s.icon, price: s.price, cost: s.cost, active: s.active, size: s.size, freeSizes: [...(s.freeSizes || [])] }); setEditingSoda(s); setSodaDialogOpen(true); };
  const handleSaveSoda = async () => {
    if (!sodaForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    const p: SodaProduct = { id: editingSoda?.id || crypto.randomUUID(), ...sodaForm };
    if (editingSoda) { await updateSodaProduct(p); toast.success('Refrigerante atualizado'); }
    else { await addSodaProduct(p); toast.success('Refrigerante adicionado'); }
    setSodaDialogOpen(false);
  };
  const confirmDeleteSoda = async () => { if (deleteSodaConfirm) { await deleteSodaProduct(deleteSodaConfirm); toast.success('Refrigerante removido'); setDeleteSodaConfirm(null); } };
  const toggleSodaFreeSize = (sz: PizzaSize) => {
    const current = sodaForm.freeSizes || [];
    setSodaForm({ ...sodaForm, freeSizes: current.includes(sz) ? current.filter(s => s !== sz) : [...current, sz] });
  };

  return (
    <PinGuard title="Produtos">
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
            <p className="text-sm text-muted-foreground">Gerencie produtos, bordas e refrigerantes</p>
          </div>
        </div>

        <Tabs defaultValue="produtos" className="w-full">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="produtos">📦 Produtos</TabsTrigger>
            <TabsTrigger value="bordas">🧀 Bordas</TabsTrigger>
            <TabsTrigger value="refrigerantes">🥤 Refrigerantes</TabsTrigger>
          </TabsList>

          {/* ===== PRODUTOS TAB ===== */}
          <TabsContent value="produtos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Todos</button>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${filterCat === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-1.5 font-bold">
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(p => (
                <div key={p.id} className="glass-card p-4 flex items-center gap-3 transition-all hover:border-primary/30">
                  <span className="text-3xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.category}{p.pizzaType ? ` · ${p.pizzaType}` : ''}</p>
                    {p.category === 'pizza' && p.pizzaPrices ? (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {PIZZA_SIZES.map(s => (
                          <span key={s.value} className="text-[10px] text-muted-foreground">
                            <span className="font-bold text-foreground">{s.value}</span> {formatCurrency(p.pizzaPrices![s.value] || 0)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-primary font-bold mt-0.5">{formatCurrency(p.price)}</p>
                    )}
                    <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Custo: {p.category === 'pizza' && p.pizzaCosts ? formatCurrency(p.pizzaCosts.G || 0) : formatCurrency(p.cost)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-secondary hover:bg-destructive/20 text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="col-span-full text-muted-foreground text-center py-12">Nenhum produto encontrado</p>}
            </div>
          </TabsContent>

          {/* ===== BORDAS TAB ===== */}
          <TabsContent value="bordas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie bordas disponíveis para pizzas</p>
              <Button onClick={openNewBorder} className="bg-primary hover:bg-primary/90 gap-1.5 font-bold">
                <Plus className="w-4 h-4" /> Nova Borda
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {borders.map(b => (
                <div key={b.id} className={`glass-card p-4 transition-all hover:border-primary/30 ${!b.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{b.name}</p>
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Custo: {formatCurrency(b.cost)}
                      </p>
                    </div>
                    <span className="text-primary font-bold text-sm">{formatCurrency(b.price)}</span>
                  </div>
                  {b.freeSizes.length > 0 && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {b.freeSizes.map(sz => (
                        <span key={sz} className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <Gift className="w-2.5 h-2.5" /> Grátis {sz}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEditBorder(b)} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteBorderConfirm(b.id)} className="p-2 rounded-lg bg-secondary hover:bg-destructive/20 text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {borders.length === 0 && <p className="col-span-full text-muted-foreground text-center py-12">Nenhuma borda cadastrada</p>}
            </div>
          </TabsContent>

          {/* ===== REFRIGERANTES TAB ===== */}
          <TabsContent value="refrigerantes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie refrigerantes disponíveis para cortesia</p>
              <Button onClick={openNewSoda} className="bg-primary hover:bg-primary/90 gap-1.5 font-bold">
                <Plus className="w-4 h-4" /> Novo Refrigerante
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sodaProducts.map(s => (
                <div key={s.id} className={`glass-card p-4 flex items-center gap-3 transition-all hover:border-primary/30 ${!s.active ? 'opacity-50' : ''}`}>
                  <span className="text-3xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.size}</p>
                    <p className="text-sm text-primary font-bold">{formatCurrency(s.price)}</p>
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Custo: {formatCurrency(s.cost)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditSoda(s)} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteSodaConfirm(s.id)} className="p-2 rounded-lg bg-secondary hover:bg-destructive/20 text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {sodaProducts.length === 0 && <p className="col-span-full text-muted-foreground text-center py-12">Nenhum refrigerante cadastrado</p>}
            </div>
          </TabsContent>
        </Tabs>

        {/* Product Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Produto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria *</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setForm({...form, category: c.value, ...(c.value === 'pizza' ? {pizzaType:'tradicional',pizzaPrices:{...DEFAULT_PIZZA_PRICES},pizzaCosts:{...DEFAULT_PIZZA_PRICES}} : {pizzaType:undefined,pizzaPrices:undefined,pizzaCosts:undefined})})}
                      className={`px-2 py-1.5 rounded text-xs font-medium ${form.category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ícone</label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm({...form,icon})} className={`w-8 h-8 rounded flex items-center justify-center text-lg ${form.icon === icon ? 'bg-primary' : 'bg-secondary hover:bg-accent'}`}>{icon}</button>
                  ))}
                </div>
              </div>
              {isPizza && (<>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {PIZZA_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm({...form,pizzaType:t.value})} className={`px-2 py-1 rounded text-[10px] font-medium ${form.pizzaType === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Preços *</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {PIZZA_SIZES.map(s => (
                      <div key={s.value}><span className="text-[10px] text-muted-foreground">{s.value}</span>
                        <Input type="number" step="0.01" value={form.pizzaPrices?.[s.value]||''} onChange={e => setForm({...form,pizzaPrices:{...form.pizzaPrices!,[s.value]:parseFloat(e.target.value)||0}})} className="bg-secondary border-border h-8 text-xs" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3"/>Custos</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {PIZZA_SIZES.map(s => (
                      <div key={s.value}><span className="text-[10px] text-muted-foreground">{s.value}</span>
                        <Input type="number" step="0.01" value={form.pizzaCosts?.[s.value]||''} onChange={e => setForm({...form,pizzaCosts:{...form.pizzaCosts!,[s.value]:parseFloat(e.target.value)||0}})} className="bg-secondary border-border h-8 text-xs" />
                      </div>
                    ))}
                  </div>
                </div>
              </>)}
              {!isPizza && (<>
                <div><label className="text-xs text-muted-foreground">Preço *</label><Input type="number" step="0.01" value={form.price||''} onChange={e => setForm({...form,price:parseFloat(e.target.value)||0})} className="bg-secondary border-border" /></div>
                <div><label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3"/>Custo</label><Input type="number" step="0.01" value={form.cost||''} onChange={e => setForm({...form,cost:parseFloat(e.target.value)||0})} className="bg-secondary border-border" /></div>
              </>)}
              <div>
                <label className="text-xs text-muted-foreground">Observações</label>
                {(form.observations||[]).map((obs,i) => (
                  <div key={i} className="flex items-center gap-1 text-xs mt-1">
                    <span className="flex-1 bg-secondary px-2 py-1 rounded">{obs}</span>
                    <button onClick={() => setForm({...form,observations:form.observations?.filter((_,j)=>j!==i)})} className="text-destructive"><Trash2 className="w-3 h-3"/></button>
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  <Input value={obsInput} onChange={e => setObsInput(e.target.value)} placeholder="Observação..." className="bg-secondary border-border h-8 text-xs" onKeyDown={e => e.key==='Enter' && addObs()} />
                  <Button size="sm" onClick={addObs} className="h-8">+</Button>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 font-bold">{editing ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Border Edit Dialog */}
        <Dialog open={borderDialogOpen} onOpenChange={setBorderDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>{editingBorder ? 'Editar' : 'Nova'} Borda</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={borderForm.name} onChange={e => setBorderForm({...borderForm, name: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Preço (R$)</label>
                <Input type="number" step="0.01" value={borderForm.price||''} onChange={e => setBorderForm({...borderForm, price: parseFloat(e.target.value)||0})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Custo (R$)</label>
                <Input type="number" step="0.01" value={borderForm.cost||''} onChange={e => setBorderForm({...borderForm, cost: parseFloat(e.target.value)||0})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Borda grátis por tamanho</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {PIZZA_SIZES.map(sz => (
                    <button key={sz.value} onClick={() => toggleBorderFreeSize(sz.value)}
                      className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        borderForm.freeSizes.includes(sz.value)
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}>
                      {sz.value}
                      {borderForm.freeSizes.includes(sz.value) && <Check className="w-3 h-3 mx-auto mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Disponível</label>
                <button onClick={() => setBorderForm({...borderForm, active: !borderForm.active})}
                  className={`px-3 py-1 rounded text-xs font-medium ${borderForm.active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                  {borderForm.active ? 'Sim' : 'Não'}
                </button>
              </div>
              <Button onClick={handleSaveBorder} className="w-full bg-primary hover:bg-primary/90 font-bold">{editingBorder ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Soda Edit Dialog */}
        <Dialog open={sodaDialogOpen} onOpenChange={setSodaDialogOpen}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader><DialogTitle>{editingSoda ? 'Editar' : 'Novo'} Refrigerante</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={sodaForm.name} onChange={e => setSodaForm({...sodaForm, name: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tamanho</label>
                <div className="flex gap-2 mt-1">
                  {['1L', '2L', '600ml', '350ml'].map(sz => (
                    <button key={sz} onClick={() => setSodaForm({...sodaForm, size: sz})}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sodaForm.size === sz ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Preço (R$)</label>
                <Input type="number" step="0.01" value={sodaForm.price||''} onChange={e => setSodaForm({...sodaForm, price: parseFloat(e.target.value)||0})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Custo (R$)</label>
                <Input type="number" step="0.01" value={sodaForm.cost||''} onChange={e => setSodaForm({...sodaForm, cost: parseFloat(e.target.value)||0})} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Gift className="w-3 h-3" /> Grátis por tamanho de pizza</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {PIZZA_SIZES.map(sz => (
                    <button key={sz.value} onClick={() => toggleSodaFreeSize(sz.value)}
                      className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        (sodaForm.freeSizes || []).includes(sz.value)
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}>
                      {sz.value}
                      {(sodaForm.freeSizes || []).includes(sz.value) && <Check className="w-3 h-3 mx-auto mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Disponível</label>
                <button onClick={() => setSodaForm({...sodaForm, active: !sodaForm.active})}
                  className={`px-3 py-1 rounded text-xs font-medium ${sodaForm.active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                  {sodaForm.active ? 'Sim' : 'Não'}
                </button>
              </div>
              <Button onClick={handleSaveSoda} className="w-full bg-primary hover:bg-primary/90 font-bold">{editingSoda ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete product confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete border confirm */}
      <AlertDialog open={!!deleteBorderConfirm} onOpenChange={(open) => !open && setDeleteBorderConfirm(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover borda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBorder}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete soda confirm */}
      <AlertDialog open={!!deleteSodaConfirm} onOpenChange={(open) => !open && setDeleteSodaConfirm(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover refrigerante?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSoda}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PinGuard>
  );
}
