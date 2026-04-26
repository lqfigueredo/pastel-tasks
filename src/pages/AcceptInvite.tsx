import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InvitePreview {
  email: string;
  display_name: string | null;
  inviter_name: string;
  team_name: string | null;
  expires_at: string;
}

const AcceptInvite = () => {
  const { t } = useTranslation('auth');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setErrorCode] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError(t('acceptInvite.loadingError'));
        setLoading(false);
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('accept-team-invite', {
        body: { token, mode: 'preview' },
      });

      if (invokeError || data?.error) {
        setError(data?.error || invokeError?.message || t('acceptInvite.invalidInvite'));
        setErrorCode(data?.code || null);
      } else {
        setInvite(data);
        setDisplayName(data.display_name || '');
      }
      setLoading(false);
    };
    loadInvite();
  }, [token, t]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t('acceptInvite.toast.passwordsMismatch'), variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: t('acceptInvite.toast.passwordTooShort'), variant: 'destructive' });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: t('acceptInvite.toast.nameRequired'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { data, error: invokeError } = await supabase.functions.invoke('accept-team-invite', {
      body: {
        token,
        mode: 'accept',
        password,
        displayName: displayName.trim(),
      },
    });
    setSubmitting(false);

    if (invokeError || data?.error) {
      toast({
        title: t('acceptInvite.toast.errorTitle'),
        description: data?.error || invokeError?.message || t('acceptInvite.toast.errorFallback'),
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: t('acceptInvite.toast.successTitle'),
      description: t('acceptInvite.toast.successDescription'),
    });
    navigate('/auth?invited=1');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>{t('acceptInvite.invalidTitle')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              {t('acceptInvite.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>{t('acceptInvite.invitedTitle')}</CardTitle>
          <CardDescription>
            {invite.team_name ? (
              <Trans
                i18nKey="acceptInvite.invitedByWithTeam"
                ns="auth"
                values={{ inviter: invite.inviter_name, team: invite.team_name }}
                components={{ strong: <strong /> }}
              />
            ) : (
              <Trans
                i18nKey="acceptInvite.invitedByNoTeam"
                ns="auth"
                values={{ inviter: invite.inviter_name }}
                components={{ strong: <strong /> }}
              />
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('acceptInvite.emailLabel')}</Label>
              <Input value={invite.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accept-name">{t('acceptInvite.nameLabel')}</Label>
              <Input
                id="accept-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accept-password">{t('acceptInvite.passwordLabel')}</Label>
              <Input
                id="accept-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accept-confirm">{t('acceptInvite.confirmPasswordLabel')}</Label>
              <Input
                id="accept-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t('acceptInvite.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
