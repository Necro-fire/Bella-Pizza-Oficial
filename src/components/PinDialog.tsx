import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PinDialog({ open, onClose, onSuccess }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { unlockPin } = useStore();

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (unlockPin(next)) {
        setPin('');
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 600);
      }
    }
  };

  const handleClear = () => { setPin(''); setError(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPin(''); onClose(); } }}>
      <DialogContent className="sm:max-w-[320px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">Digite o PIN</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                  error ? 'border-destructive bg-destructive/10' : pin.length > i ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                }`}
              >
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>
          {error && <p className="text-destructive text-sm">PIN incorreto</p>}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d) => (
              <Button
                key={d}
                variant={d === '⌫' ? 'secondary' : 'outline'}
                className="w-16 h-14 text-xl font-semibold"
                disabled={d === ''}
                onClick={() => d === '⌫' ? handleClear() : handleDigit(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
