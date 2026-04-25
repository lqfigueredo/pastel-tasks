import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSubject?: string;
  contextLabel?: string;
  onSuccess?: () => void;
}

export const ActivateSubscriptionDialog = ({
  open,
  onOpenChange,
  defaultSubject,
  contextLabel,
  onSuccess,
}: Props) => {
  const { t } = useTranslation('billing');
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subject = defaultSubject ?? t('payment.activateSubject');
  const ctxLabel = contextLabel ?? t('payment.activateLabel');

  const submit = async () => {
    if (!user) return;
    if (!message.trim()) {
      toast.error(t('activate.errorEmpty'));
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          subject,
          created_by: user.id,
          status: 'open',
        })
        .select('id')
        .single();
      if (tErr) throw tErr;

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `[${ctxLabel}]\n\n${message.trim()}`,
      });
      if (mErr) throw mErr;

      toast.success(t('activate.success'));
      setMessage('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      toast.error(t('activate.errorSubmit', { message: m }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> {t('activate.title')}
          </DialogTitle>
          <DialogDescription>{t('activate.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="msg">{t('activate.messageLabel')}</Label>
          <Textarea
            id="msg"
            placeholder={t('activate.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('activate.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('activate.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
