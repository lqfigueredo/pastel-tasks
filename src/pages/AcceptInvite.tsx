import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Token de convite não fornecido');
        setLoading(false);
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('accept-team-invite', {
        body: { token, mode: 'preview' },
      });

      if (invokeError || data?.error) {
        setError(data?.error || invokeError?.message || 'Convite inválido');
        setErrorCode(data?.code || null);
      } else {
        setInvite(data);
        setDisplayName(data.display_name || '');
      }
      setLoading(false);
    };
    loadInvite();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
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
        title: 'Erro ao aceitar convite',
        description: data?.error || invokeError?.message || 'Tente novamente',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Conta criada com sucesso!',
      description: 'Faça login para começar a usar a plataforma.',
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
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              Ir para o início
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
          <CardTitle>Você foi convidado!</CardTitle>
          <CardDescription>
            <strong>{invite.inviter_name}</strong> convidou você
            {invite.team_name ? ` para o time "${invite.team_name}"` : ''} no NEVVOH.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invite.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accept-name">Seu nome *</Label>
              <Input
                id="accept-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accept-password">Senha *</Label>
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
              <Label htmlFor="accept-confirm">Confirmar senha *</Label>
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
              Criar conta e aceitar convite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
