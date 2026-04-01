import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, Package, Wallet, Receipt, Unlock, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { maskCNPJ } from '@/lib/format';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

const links = [
  { to: '/', label: 'PDV', icon: ShoppingCart },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
  { to: '/vendas', label: 'Vendas', icon: Receipt },
];

export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { pinUnlocked, lockPin, logout, changePassword, changePin, setCnpj, cnpj } = useAuthStore();
  const { companyName } = useAuthStore();
  const { cashRegister, cart } = useStore();
  const isRegisterOpen = cashRegister && !cashRegister.closedAt;
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'password' | 'pin' | 'cnpj'>('password');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PIN fields
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // CNPJ field
  const [newCnpj, setNewCnpj] = useState('');

  const [navAlert, setNavAlert] = useState<{ to: string } | null>(null);

  const resetFields = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    setNewCnpj('');
  };

  const handleNavClick = (to: string, e: React.MouseEvent) => {
    if (pathname === '/' && to !== '/' && cart.length > 0) {
      e.preventDefault();
      setNavAlert({ to });
    }
  };

  const confirmNav = () => {
    if (navAlert) {
      navigate(navAlert.to);
      setNavAlert(null);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos'); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem'); return;
    }
    if (changePassword(currentPassword, newPassword)) {
      toast.success('Senha alterada com sucesso');
      setShowSettings(false); resetFields();
    } else {
      toast.error('Senha atual incorreta');
    }
  };

  const handleChangePin = () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Preencha todos os campos'); return;
    }
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      toast.error('O PIN deve ter 4 dígitos'); return;
    }
    if (newPin !== confirmPin) {
      toast.error('Os PINs não coincidem'); return;
    }
    if (changePin(currentPin, newPin)) {
      toast.success('PIN alterado com sucesso');
      setShowSettings(false); resetFields();
    } else {
      toast.error('PIN atual incorreto');
    }
  };

  const handleChangeCnpj = () => {
    const digits = newCnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      toast.error('CNPJ inválido'); return;
    }
    setCnpj(newCnpj);
    toast.success('CNPJ alterado com sucesso');
    setShowSettings(false); resetFields();
  };

  const openSettings = () => {
    resetFields();
    setSettingsTab('password');
    setShowSettings(true);
  };

  return (
    <>
      <nav className="h-12 bg-card border-b border-border flex items-center px-4 gap-1 shrink-0 shadow-sm">
        <span className="text-primary font-extrabold text-sm tracking-tight mr-5 flex items-center gap-1.5">
          🍕 {companyName}
        </span>

        <div className="flex gap-0.5">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={(e) => handleNavClick(l.to, e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <l.icon className="w-3.5 h-3.5" />
                {l.label}
                {l.to === '/caixa' && isRegisterOpen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isRegisterOpen && (
            <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded font-medium">
              Caixa Aberto
            </span>
          )}
          {pinUnlocked && (
            <button onClick={lockPin} className="text-success hover:text-foreground transition-colors p-1" title="Bloquear PIN">
              <Unlock className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={openSettings} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Configurações">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Sair">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      <AlertDialog open={!!navAlert} onOpenChange={(open) => !open && setNavAlert(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mudar de página?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem itens no carrinho. Ao sair do PDV, o carrinho será perdido. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNav}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant={settingsTab === 'password' ? 'default' : 'outline'} onClick={() => { setSettingsTab('password'); resetFields(); }} className="text-xs">Senha</Button>
            <Button size="sm" variant={settingsTab === 'pin' ? 'default' : 'outline'} onClick={() => { setSettingsTab('pin'); resetFields(); }} className="text-xs">PIN</Button>
            <Button size="sm" variant={settingsTab === 'cnpj' ? 'default' : 'outline'} onClick={() => { setSettingsTab('cnpj'); resetFields(); }} className="text-xs">CNPJ</Button>
          </div>

          {settingsTab === 'password' && (
            <div className="space-y-3">
              <PasswordInput placeholder="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-secondary border-border" />
              <PasswordInput placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary border-border" />
              <PasswordInput placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-secondary border-border" />
              <Button onClick={handleChangePassword} className="w-full">Alterar Senha</Button>
            </div>
          )}

          {settingsTab === 'pin' && (
            <div className="space-y-3">
              <PasswordInput placeholder="PIN atual" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="bg-secondary border-border" />
              <PasswordInput placeholder="Novo PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="bg-secondary border-border" />
              <PasswordInput placeholder="Confirmar novo PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="bg-secondary border-border" />
              <Button onClick={handleChangePin} className="w-full">Alterar PIN</Button>
            </div>
          )}

          {settingsTab === 'cnpj' && (
            <div className="space-y-3">
              <Input
                placeholder="CNPJ"
                value={newCnpj}
                onChange={(e) => setNewCnpj(maskCNPJ(e.target.value))}
                className="bg-secondary border-border"
              />
              <Button onClick={handleChangeCnpj} className="w-full">Alterar CNPJ</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
