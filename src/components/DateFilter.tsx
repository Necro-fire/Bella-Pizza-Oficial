import { useState } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

interface DateFilterProps {
  onFilter: (start: Date, end: Date, preset?: DatePreset) => void;
}

export function DateFilter({ onFilter }: DateFilterProps) {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const apply = (p: DatePreset) => {
    setPreset(p);
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);
    switch (p) {
      case 'today': start = startOfDay(now); break;
      case 'yesterday': start = startOfDay(subDays(now, 1)); end = endOfDay(subDays(now, 1)); break;
      case '7days': start = startOfDay(subDays(now, 6)); break;
      case '30days': start = startOfDay(subDays(now, 29)); break;
      case 'custom': return;
      default: start = startOfDay(now);
    }
    onFilter(start, end, p);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) { toast.error('Selecione data inicial e final'); return; }
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T23:59:59');
    if (e < s) { toast.error('Data final não pode ser menor que a inicial'); return; }
    onFilter(s, endOfDay(e), 'custom');
  };

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: '7days', label: '7 Dias' },
    { value: '30days', label: '30 Dias' },
    { value: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={preset === p.value ? 'default' : 'outline'}
          onClick={() => apply(p.value)}
          className={`text-xs ${preset === p.value ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {p.label}
        </Button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-secondary border-border h-8 text-xs w-36" />
          <span className="text-muted-foreground text-xs">até</span>
          <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-secondary border-border h-8 text-xs w-36" />
          <Button size="sm" onClick={applyCustom} className="bg-primary text-primary-foreground text-xs">Filtrar</Button>
        </div>
      )}
    </div>
  );
}

export function filterByDate<T extends { date: string }>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    const d = new Date(item.date);
    return d >= start && d <= end;
  });
}
