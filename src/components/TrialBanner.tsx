import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';

const DISMISS_KEY = 'trial-banner-dismissed';

export default function TrialBanner() {
  const { isTrialing, daysLeft, urgency } = useTrialStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (!isTrialing || dismissed) return null;
  if (location.pathname === '/cobranca') return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const tone = {
    info: 'bg-primary/10 text-foreground border-b border-primary/20',
    warning: 'bg-yellow-500/15 text-foreground border-b border-yellow-500/30',
    critical: 'bg-destructive text-destructive-foreground',
  }[urgency];

  const Icon = urgency === 'critical' ? AlertTriangle : urgency === 'warning' ? Clock : Sparkles;

  const message =
    daysLeft === 0
      ? 'Seu período de teste termina hoje.'
      : daysLeft === 1
        ? 'Falta 1 dia do seu período de teste gratuito.'
        : `Faltam ${daysLeft} dias do seu período de teste gratuito.`;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{message}</span>
      <Button
        size="sm"
        variant={urgency === 'critical' ? 'secondary' : 'default'}
        onClick={() => navigate('/cobranca')}
      >
        Ver plano
      </Button>
      <button
        onClick={handleDismiss}
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
