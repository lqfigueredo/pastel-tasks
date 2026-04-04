import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

interface ReplyLeadDialogProps {
  lead: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DEFAULT_MESSAGE = 'Agradecemos pelo seu interesse no NEVVOH! Informamos que você já pode se cadastrar na nossa plataforma e começar a utilizar todas as funcionalidades. Acesse o link abaixo para criar sua conta.';

const ReplyLeadDialog = ({ lead, open, onOpenChange, onSuccess }: ReplyLeadDialogProps) => {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!lead) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'lead-reply',
          recipientEmail: lead.email,
          idempotencyKey: `lead-reply-${lead.id}-${Date.now()}`,
          templateData: { leadName: lead.name, message },
        },
      });
      if (error) throw error;

      await supabase.from('leads').update({
        replied_at: new Date().toISOString(),
        reply_message: message,
      }).eq('id', lead.id);

      toast.success('E-mail enviado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder Lead</DialogTitle>
          <DialogDescription>
            Enviar e-mail para <strong>{lead?.name}</strong> ({lead?.email})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Digite sua mensagem..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessage(DEFAULT_MESSAGE)}
            className="text-xs"
          >
            Restaurar mensagem padrão
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="h-4 w-4 mr-1" />
            {sending ? 'Enviando...' : 'Enviar E-mail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplyLeadDialog;
