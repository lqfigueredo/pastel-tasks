import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('landing');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('submit-lead', {
      body: { name: name.trim(), email: email.trim() },
    });
    setLoading(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || t('lead.toast.errorGeneric'));
      return;
    }

    toast.success(t('lead.toast.success'));
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('lead.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('lead.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">{t('lead.form.name')}</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('lead.form.namePlaceholder')}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">{t('lead.form.email')}</Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('lead.form.emailPlaceholder')}
              required
              maxLength={255}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('lead.form.submitting') : t('lead.form.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
