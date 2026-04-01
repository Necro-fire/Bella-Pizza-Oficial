import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface ProfessionalAlertProps {
  open: boolean;
  onClose: () => void;
  variant: AlertVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  children?: React.ReactNode;
}

const variantConfig: Record<AlertVariant, {
  icon: React.ElementType;
  iconColor: string;
  bgIcon: string;
  borderColor: string;
  confirmClass: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-success',
    bgIcon: 'bg-success/10',
    borderColor: 'border-success/20',
    confirmClass: 'bg-success hover:bg-success/90 text-success-foreground',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-destructive',
    bgIcon: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    confirmClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    bgIcon: 'bg-warning/10',
    borderColor: 'border-warning/20',
    confirmClass: 'bg-warning hover:bg-warning/90 text-warning-foreground',
  },
  info: {
    icon: Info,
    iconColor: 'text-info',
    bgIcon: 'bg-info/10',
    borderColor: 'border-info/20',
    confirmClass: 'bg-info hover:bg-info/90 text-info-foreground',
  },
};

export function ProfessionalAlert({
  open, onClose, variant, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  onConfirm, onCancel, showCancel = true, children,
}: ProfessionalAlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={cn(
        'sm:max-w-[420px] bg-card/95 backdrop-blur-xl border shadow-2xl p-0 gap-0 overflow-hidden [&>button]:hidden',
        config.borderColor,
      )}>
        {/* Top accent bar */}
        <div className={cn('h-1')} style={{
          background: variant === 'success' ? 'hsl(var(--success))' :
            variant === 'error' ? 'hsl(var(--destructive))' :
            variant === 'warning' ? 'hsl(var(--warning))' :
            'hsl(var(--info))',
        }} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', config.bgIcon)}>
              <Icon className={cn('w-6 h-6', config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          {/* Custom content */}
          {children && <div className="mb-4">{children}</div>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            {showCancel && (
              <Button variant="outline" size="sm" onClick={onCancel || onClose} className="font-medium">
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button size="sm" onClick={onConfirm} className={cn('font-bold', config.confirmClass)}>
                {confirmLabel}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
