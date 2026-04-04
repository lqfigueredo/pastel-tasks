import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.webp';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === 'already_unsubscribed') setStatus('already');
        else if (d.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) throw error;
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  const messages: Record<Status, { title: string; desc: string }> = {
    loading: { title: 'Verificando...', desc: 'Aguarde um momento.' },
    valid: { title: 'Cancelar inscrição', desc: 'Clique no botão abaixo para confirmar o cancelamento de e-mails.' },
    already: { title: 'Já cancelado', desc: 'Você já cancelou a inscrição anteriormente.' },
    invalid: { title: 'Link inválido', desc: 'Este link de cancelamento é inválido ou expirou.' },
    success: { title: 'Inscrição cancelada', desc: 'Você não receberá mais e-mails transacionais.' },
    error: { title: 'Erro', desc: 'Não foi possível processar sua solicitação. Tente novamente.' },
  };

  const { title, desc } = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="NEVVOH" className="h-12 w-12 mx-auto rounded-xl" />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{desc}</p>
        {status === 'valid' && (
          <Button onClick={handleConfirm} variant="destructive">Confirmar cancelamento</Button>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
