import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';

export default function TrialBanner() {
  const { isTrialing, daysLeft, urgency } = useTrialStatus();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isTrialing) return null;
  if (location.pathname === '/cobranca') return null;

  const tone = {
    info: 'bg-primary/10 text-foreground border-b border-primary/20',
    warning: 'bg-yellow-500/15 text-foreground border-b border-yellow-500/30',
    critical: 'bg-destructive text-destructive-foreground',
  }[urgency];

  const Icon = urgency === 'critical' ? AlertTriangle : urgency === 'warning' ? Clock : Sparkles;

  const message =
    daysLeft === 0
      ? 'Teste grátis termina hoje.'
      : daysLeft === 1
        ? 'Teste grátis: 1 dia restante.'
        : `Teste grátis: ${daysLeft} dias restantes.`;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate font-medium">{message}</span>
      <Button
        size="sm"
        variant={urgency === 'critical' ? 'secondary' : 'default'}
        onClick={() => navigate('/cobranca')}
      >
        Ver plano
      </Button>
    </div>
  );
}
