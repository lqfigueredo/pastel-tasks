import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  teamId: string | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step3Invites = ({ teamId, onNext, onBack, onSkip }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email1, setEmail1] = useState('');
  const [email2, setEmail2] = useState('');

  const handleInvite = async () => {
    const emails = [email1, email2].map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      onNext();
      return;
    }
    setLoading(true);
    let success = 0;
    let failed: string[] = [];
    for (const email of emails) {
      try {
        const { error } = await supabase.functions.invoke('invite-team-member', {
          body: { email, teamId },
        });
        if (error) throw error;
        success++;
      } catch (err: any) {
        failed.push(`${email}: ${err.context?.error || err.message}`);
      }
    }
    setLoading(false);
    if (success > 0) toast({ title: `${success} convite(s) enviado(s)` });
    if (failed.length > 0) {
      toast({
        title: 'Alguns convites falharam',
        description: failed.join('\n'),
        variant: 'destructive',
      });
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">Convide colegas</h3>
        <p className="text-sm text-muted-foreground">
          Convide até dois colegas agora. Eles receberão um link por email para criar a conta.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email1">Email 1</Label>
        <Input id="email1" type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} placeholder="colega@empresa.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email2">Email 2 (opcional)</Label>
        <Input id="email2" type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} placeholder="outro@empresa.com" />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>Pular tudo</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button variant="outline" onClick={onNext}>Pular</Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar convites
          </Button>
        </div>
      </div>
    </div>
  );
};
