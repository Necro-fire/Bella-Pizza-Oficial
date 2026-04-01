import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { maskCNPJ } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type View = 'login' | 'forgot-password' | 'forgot-pin';

export function LoginPage() {
  const { login, recoverPasswordWithPin, recoverPinWithCredentials, loadFromDb } = useAuthStore();
  const [view, setView] = useState<View>('login');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(cnpj, password);
    if (success) {
      toast.success('Login realizado!');
    } else {
      toast.error('CNPJ ou senha incorretos');
    }
  };

  const handleRecoverPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const result = recoverPasswordWithPin(pin);
    if (result) {
      toast.success(`Sua senha é: ${result}`);
      setView('login');
      setPin('');
    } else {
      toast.error('PIN incorreto');
    }
  };

  const handleRecoverPin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = recoverPinWithCredentials(cnpj, password);
    if (result) {
      toast.success(`Seu PIN é: ${result}`);
      setView('login');
    } else {
      toast.error('CNPJ ou senha incorretos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm glass-card p-8 animate-scale-in">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🍕</span>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Bella Pizza</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão</p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ</label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Senha</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold">
              Entrar
            </Button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => setView('forgot-password')} className="text-primary hover:underline">
                Esqueci a senha
              </button>
              <button type="button" onClick={() => setView('forgot-pin')} className="text-primary hover:underline">
                Esqueci o PIN
              </button>
            </div>
          </form>
        )}

        {view === 'forgot-password' && (
          <form onSubmit={handleRecoverPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">Informe seu PIN para recuperar a senha:</p>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN (4 dígitos)"
              className="bg-secondary border-border"
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold">
              Recuperar Senha
            </Button>
            <button type="button" onClick={() => { setView('login'); setPin(''); }} className="text-xs text-primary hover:underline w-full text-center">
              Voltar ao login
            </button>
          </form>
        )}

        {view === 'forgot-pin' && (
          <form onSubmit={handleRecoverPin} className="space-y-4">
            <p className="text-sm text-muted-foreground">Informe CNPJ e senha para recuperar o PIN:</p>
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              placeholder="CNPJ"
              className="bg-secondary border-border"
            />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="bg-secondary border-border"
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold">
              Recuperar PIN
            </Button>
            <button type="button" onClick={() => setView('login')} className="text-xs text-primary hover:underline w-full text-center">
              Voltar ao login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
