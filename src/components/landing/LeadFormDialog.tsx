import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cloudflare's testing site key — always passes. Replace by setting VITE_TURNSTILE_SITE_KEY.
const TURNSTILE_TEST_KEY = '1x00000000000000000000AA';
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || TURNSTILE_TEST_KEY;

const LeadFormDialog = ({ open, onOpenChange }: LeadFormDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const reset = () => {
    setName('');
    setEmail('');
    setToken('');
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!token) {
      toast.error('Aguarde a verificação anti-bot.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('submit-lead', {
      body: { name: name.trim(), email: email.trim(), turnstile_token: token },
    });
    setLoading(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || 'Erro ao enviar. Tente novamente.');
      turnstileRef.current?.reset();
      setToken('');
      return;
    }

    toast.success('Obrigado pelo interesse! Entraremos em contato.');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demonstre seu interesse</DialogTitle>
          <DialogDescription>
            Preencha seus dados e entraremos em contato para apresentar o NEVVOH.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Nome</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">E-mail</Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              maxLength={255}
            />
          </div>
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={SITE_KEY}
              onSuccess={setToken}
              onError={() => setToken('')}
              onExpire={() => setToken('')}
              options={{ theme: 'auto', size: 'flexible' }}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
