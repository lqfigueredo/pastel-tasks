import { useState } from 'react';
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

const LeadFormDialog = ({ open, onOpenChange }: LeadFormDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('leads').insert({ name: name.trim(), email: email.trim() });
    setLoading(false);

    if (error) {
      toast.error('Erro ao enviar. Tente novamente.');
      return;
    }

    toast.success('Obrigado pelo interesse! Entraremos em contato.');
    setName('');
    setEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
