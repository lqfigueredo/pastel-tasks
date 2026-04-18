import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Mail } from 'lucide-react';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string | null;
  onInvited?: () => void;
}

export const InviteUserDialog = ({ open, onOpenChange, teamId, onInvited }: InviteUserDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('invite-team-member', {
      body: {
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        teamId: teamId || undefined,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      const msg = (data?.error as string) || error?.message || 'Erro ao enviar convite';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Convite enviado!',
      description: `Um email foi enviado para ${email}. O convite expira em 7 dias.`,
    });
    setEmail('');
    setDisplayName('');
    onOpenChange(false);
    onInvited?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convidar por email
          </DialogTitle>
          <DialogDescription>
            Envie um convite por email. O convidado define a própria senha e entra direto na plataforma.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome (opcional)</Label>
            <Input
              id="invite-name"
              placeholder="Nome do convidado"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
