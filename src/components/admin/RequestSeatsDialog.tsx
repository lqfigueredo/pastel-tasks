import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentSeats: number;
  suggestedSeats?: number;
  onSuccess?: () => void;
}

export const RequestSeatsDialog = ({
  open,
  onOpenChange,
  currentSeats,
  suggestedSeats,
  onSuccess,
}: Props) => {
  const { t } = useTranslation('billing');
  const { user } = useAuth();
  const [requested, setRequested] = useState<number>(suggestedSeats ?? currentSeats + 5);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRequested(suggestedSeats ?? currentSeats + 5);
      setReason('');
    }
  }, [open, suggestedSeats, currentSeats]);

  const diff = requested - currentSeats;

  const submit = async () => {
    if (!user) return;
    if (requested <= currentSeats) {
      toast.error(t('requestSeats.errors.tooLow', { current: currentSeats }));
      return;
    }
    if (reason.trim().length < 10) {
      toast.error(t('requestSeats.errors.reasonShort'));
      return;
    }
    setSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const adminName = profile?.display_name || user.email || t('requestSeats.labels.defaultAdmin');

      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          subject: t('requestSeats.subject'),
          created_by: user.id,
          status: 'open',
        })
        .select('id')
        .single();
      if (tErr) throw tErr;

      const content = [
        t('requestSeats.header'),
        ``,
        `${t('requestSeats.labels.admin')}: ${adminName}`,
        `${t('requestSeats.labels.current')}: ${currentSeats}`,
        `${t('requestSeats.labels.requested')}: ${requested}`,
        `${t('requestSeats.labels.diff')}: +${diff}`,
        ``,
        `${t('requestSeats.labels.reason')}:`,
        reason.trim(),
      ].join('\n');

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content,
      });
      if (mErr) throw mErr;

      toast.success(t('requestSeats.success'));
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const m = err instanceof Error ? err.message : t('activate.errorSubmit', { message: '' });
      toast.error(t('requestSeats.errors.submit', { message: m }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> {t('requestSeats.title')}
          </DialogTitle>
          <DialogDescription>
            {t('requestSeats.description', { seats: currentSeats })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seats">{t('requestSeats.fields.totalLabel')}</Label>
            <Input
              id="seats"
              type="number"
              min={currentSeats + 1}
              value={requested}
              onChange={(e) => setRequested(Number(e.target.value) || currentSeats + 1)}
            />
            {diff > 0 && (
              <p className="text-xs text-muted-foreground">
                <Trans
                  i18nKey="requestSeats.fields.diffHelp"
                  t={t}
                  values={{ diff, current: currentSeats }}
                  components={{ bold: <span className="font-semibold text-foreground" /> }}
                />
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('requestSeats.fields.reasonLabel')}</Label>
            <Textarea
              id="reason"
              placeholder={t('requestSeats.fields.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('requestSeats.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('requestSeats.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestSeatsDialog;
