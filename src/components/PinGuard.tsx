import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Lock, Delete, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PinGuardProps {
  children: React.ReactNode;
  title?: string;
}

export function PinGuard({ children, title = 'Área Protegida' }: PinGuardProps) {
  const { pinUnlocked, unlockPin } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const MAX_PIN = 4;

  const addDigit = useCallback((digit: string) => {
    setError(false);
    setPin(prev => prev.length < MAX_PIN ? prev + digit : prev);
  }, []);

  const removeDigit = useCallback(() => {
    setError(false);
    setPin(prev => prev.slice(0, -1));
  }, []);

  const confirm = useCallback(() => {
    if (pin.length === 0) return;
    if (unlockPin(pin)) {
      toast.success('PIN desbloqueado');
    } else {
      setError(true);
      setPin('');
      toast.error('PIN incorreto');
    }
  }, [pin, unlockPin]);

  useEffect(() => {
    if (pinUnlocked) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') addDigit(e.key);
      else if (e.key === 'Backspace') removeDigit();
      else if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pinUnlocked, addDigit, removeDigit, confirm]);

  if (pinUnlocked) return <>{children}</>;

  const keys = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <div className="glass-card p-8 w-full max-w-xs text-center animate-scale-in">
        <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="font-bold text-lg mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">Digite o PIN para acessar</p>

        <div className="flex justify-center gap-2.5 mb-6">
          {Array.from({ length: MAX_PIN }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? error ? 'bg-destructive border-destructive scale-110' : 'bg-primary border-primary scale-110'
                  : 'border-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive mb-3 animate-fade-in">PIN incorreto, tente novamente</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {keys.map(k => (
            <button
              key={k}
              onClick={() => addDigit(k)}
              className="h-14 rounded-xl bg-secondary text-foreground text-xl font-bold hover:bg-accent active:scale-95 transition-all"
            >
              {k}
            </button>
          ))}
          <button
            onClick={removeDigit}
            className="h-14 rounded-xl bg-secondary text-muted-foreground hover:bg-accent active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => addDigit('0')}
            className="h-14 rounded-xl bg-secondary text-foreground text-xl font-bold hover:bg-accent active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={confirm}
            disabled={pin.length === 0}
            className="h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
